import requests
import urllib3
from dotenv import load_dotenv
import os
from typing import List,Dict,Optional
import logging
import time
logger = logging.getLogger(__name__)

load_dotenv()

class SapServiceLayer:
    def __init__(self):
        self.base_url = os.getenv("SAP_BASE_URL")
        self.username = os.getenv("SAP_USERNAME")
        self.password = os.getenv("SAP_PASSWORD")
        self.company_db = os.getenv("SAP_COMPANY_DB")
        self.verify_ssl = os.getenv("SSL_VERIFY", "true").lower() == "true"
        self.session = requests.Session()

        if not self.verify_ssl:
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            self.session.verify = False
        else:
            self.session.verify = True

        self.session.headers.update({"Content-Type": "application/json"})

    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        return False
    
       #============================= Cookies ===================================

    def _request(self,method: str,endpoint: str,*,headers=None,json=None,params=None,timeout=60):
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = headers or {}

        fez_login = False

        for tentativa in range(3):
            try:
                inicio = time.time()
                resp = self.session.request(
                    method=method.upper(),
                    url=url,
                    headers=headers,
                    json=json,
                    params=params,
                    timeout=timeout
                )

                tempo = time.time() - inicio

                if tempo > 1: 
                    logger.warning(
                        f"[LENTO] {method.upper()} {endpoint} | {tempo:.2f}s | Status {resp.status_code}"
                    )
                else:
                    logger.debug(
                        f"[OK] {method.upper()} {endpoint} | {tempo:.2f}s | Status {resp.status_code}"
                    )

                if resp.status_code in (401, 403) and not fez_login:
                    logger.warning("[AUTH] Sessão expirada. Tentando login novamente...")

                    fez_login = True

                    if not self.login():
                        logger.error("[AUTH] Falha no login após 401/403")
                        raise requests.exceptions.HTTPError("Falha ao autenticar no SAP")

                    logger.info("[AUTH] Login realizado. Repetindo requisição...")
                    continue

                return resp

            except requests.exceptions.ReadTimeout as e:
                logger.warning(
                    f"[TIMEOUT] {method.upper()} {endpoint} | "
                    f"Tentativa {tentativa+1} excedeu {timeout}s"
                )

                if tentativa == 2:
                    logger.error("[TIMEOUT] Estourou todas as tentativas")
                    raise e

                continue

            except (requests.exceptions.ConnectionError,
                    requests.exceptions.ChunkedEncodingError) as e:
                    logger.warning(
                    f"[CONNECTION] Erro de conexão na tentativa {tentativa+1}: {e}"
                    )
                    if tentativa == 2:
                        logger.error("[CONNECTION] Estourou todas as tentativas")
                        raise e 

                    logger.info("[CONNECTION] Recriando sessão HTTP...")

                    self.session.close()
                    self.session = self._criar_session()

                    logger.info("[AUTH] Logando novamente...")

                    if not self.login():
                        logger.error("[AUTH] Falha ao logar após recriar sessão")
                        raise e
           
    #====================================== Requisições HTTP =======================================

    def get_endpoint(self,endpoint: str,maxpagesize: int=20):
        headers = {"Prefer": f"odata.maxpagesize={maxpagesize}"}

        try:
            response = self._request("GET",endpoint,headers=headers,timeout=60)
            response.raise_for_status()

            try:
                data = response.json()
            except ValueError:
                logger.warning("Resposta não contém JSON válido")
                return {"ok": False, "status_code": response.status_code, "data": response.text}
            
            if isinstance(data, dict) and "value" in data:
                payload = data["value"]
            elif isinstance(data, dict):
                payload = [data]
            elif isinstance(data, list):
                payload = data
            else:
                payload = []
            
            return {"ok": True,"status_code": response.status_code,"data": payload}
            
        except requests.RequestException as e:
            logger.error(f"[GET] Erro: {e}")
            return self.tratar_error(e)

    def patch_endpoint(self, endpoint: str, payload: Dict) -> dict:
        headers = {
            "Content-Type": "application/json",
            "B1S-ReplaceCollectionsOnPatch": "false"
        }

        try:
            response = self._request("PATCH", endpoint, json=payload, headers=headers)
            status_code = response.status_code

            if status_code in (200, 204):
                data = None
                if status_code == 200:
                    try:
                        data = response.json()
                    except ValueError:
                        data = response.text or None

                logger.info(f"PATCH realizado com sucesso em: {endpoint} (HTTP {status_code})")
                return {"ok": True, "status_code": status_code, "data": data}

            try:
                payload_erro = response.json()
            except ValueError:
                payload_erro = response.text

            logger.error(f"Erro HTTP {status_code} ao fazer PATCH em {endpoint}: {payload_erro}")
            return {"ok": False, "status_code": status_code, "data": payload_erro}
        
        except requests.RequestException as e:
            logger.error(f"[PATCH] Erro de comunicação: {e}")
            return self.tratar_error(e)
            
    def post_endpoint(self, endpoint: str, payload: Dict):
        try:
            response = self._request("POST", endpoint, json=payload)
            response.raise_for_status()

            try:
                data = response.json()
            except ValueError:
                logger.warning("Resposta não contém JSON válido")
                return {"ok": False, "status_code": response.status_code,"data": response.text}

            return {"ok": True, "status_code": response.status_code, "data": data}
    
        except requests.RequestException as e:
            logger.error(f"[POST] Erro de comunicação: {e}")
            return self.tratar_error(e)

      #============================= AUTENTICAÇÃO ==============================

    def login(self):
        logger.info("Login realizado!")
        payload = {
            "CompanyDB": self.company_db,
            "UserName": self.username,
            "Password": self.password
        }
        try:
            response = self.session.post(f"{self.base_url}/Login",json=payload)
            response.raise_for_status()
            return True
        except requests.RequestException as e:
            logger.error(f"Falha no login: {e}")
            if e.response is not None:
                print(f"Detalhes: {e.response.text}")
            return False
        
    def logout(self):
        try:
            self.session.post(f"{self.base_url}/Logout")
            return True
        except requests.RequestException as e:
            logger.error(f"Falha ao fazer logout: {e}")
            return False
        
    def _criar_session(self):
        session = requests.Session()

        session.headers.update({"Content-Type": "application/json"})
        session.verify = self.verify_ssl

        if not self.verify_ssl:
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        return session
    
    def tratar_error(self, e):
        if isinstance(e, requests.exceptions.ReadTimeout):
            return {
                "ok": False,
                "status_code": 504,
                "data": "O SAP demorou para responder. Tente novamente."
            }

        if isinstance(e, requests.exceptions.ConnectionError):
            return {
                "ok": False,
                "status_code": 500,
                "data": "Falha de conexão com o SAP."
            }

        resp = getattr(e, "response", None)

        if resp is not None:
            try:
                data = resp.json()
            except ValueError:
                data = resp.text
        else:
            data = str(e)

        return {
            "ok": False,
            "status_code": resp.status_code if resp else 500,
            "data": data
        }