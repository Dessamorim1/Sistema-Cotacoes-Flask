import requests
import urllib3
from dotenv import load_dotenv
import os
from typing import List,Dict,Optional
import logging
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

    def _request(self, method: str, endpoint: str, *, headers=None, json=None, params=None, timeout=30, retry=True):
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = headers or {}

        try:
            resp = self.session.request(
                method=method.upper(),
                url=url,
                headers=headers,
                json=json,
                params=params,
                timeout=timeout
            )

            if resp.status_code in (401, 403) and retry:
                if self.login():
                    return self._request(
                        method, endpoint,
                        headers=headers, json=json, params=params,
                        timeout=timeout, retry=False
                    )

            return resp

        except requests.RequestException as e:
            raise  

    #====================================== Requisições HTTP =======================================

    def get_endpoint(self,endpoint: str,maxpagesize: int=20):
        headers = {"Prefer": f"odata.maxpagesize={maxpagesize}"}

        try:
            response = self._request("GET",endpoint,headers=headers,timeout=30)
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
            logger.error(f"Erro na requisição: {e}")

            resp = getattr(e, "response", None)
            status = resp.status_code if resp is not None else None

            if resp is not None:
                try:
                    payload_erro = resp.json()
                except ValueError:
                    payload_erro = resp.text
            else:
                payload_erro = str(e)

            return {"ok": False, "status_code": status, "data": payload_erro}

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

        except requests.exceptions.RequestException as e:
            resp = getattr(e, "response", None)
            status_code = resp.status_code if resp is not None else 500

            if resp is not None:
                try:
                    payload_erro = resp.json()
                except ValueError:
                    payload_erro = resp.text
            else:
                payload_erro = str(e)

            logger.exception(
                f"Falha de comunicação ao fazer PATCH em {endpoint} (HTTP {status_code}): {payload_erro}"
            )
            return {"ok": False, "status_code": status_code, "data": payload_erro}
        
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
            logger.error(f"Erro na requisição: {e}")

            resp = getattr(e, "response", None)
            status = resp.status_code if resp is not None else None

            if resp is not None:
                try:
                    payload_erro = resp.json()
                except ValueError:
                    payload_erro = resp.text
            else:
                payload_erro = str(e)

            return {"ok": False, "status_code": status, "data": payload_erro}

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