from exceptions import SAPError
import logging

logger = logging.getLogger(__name__)

def tratar_mensagem(erro_sap):
    if isinstance(erro_sap, dict):
        return (
            erro_sap.get("error", {})
                    .get("message", {})
                    .get("value")
            or "Erro ao comunicar com o SAP"
        )
    
    if isinstance(erro_sap, str):
        return erro_sap

    return "Erro ao comunicar com o SAP"

def if_not_ok(res):
    if res.get("ok"):
        return

    erro_sap = res.get("data") or {}
    logger.error(f"Erro SAP: {erro_sap}")

    mensagem = tratar_mensagem(erro_sap)
    status = res.get("status_code") or 500

    code = None
    if isinstance(erro_sap,dict):
        code = (erro_sap.get("error") or {}).get("code")

    raise SAPError(mensagem, status,code)