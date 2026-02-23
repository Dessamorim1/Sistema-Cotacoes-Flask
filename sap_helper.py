from service_layer import SapServiceLayer
import threading

_lock = threading.Lock()
_sap_instance = None

def get_sap() -> SapServiceLayer:
    global _sap_instance

    if _sap_instance is None:
        with _lock:
            if _sap_instance is None:
                sap = SapServiceLayer()
                if not sap.login():
                    raise ConnectionError("Falha ao autenticar no SAP Service Layer.")
                _sap_instance = sap

    return _sap_instance
