from flask import Blueprint,request,jsonify
from sap_helper import get_sap
from tratamento_sap import if_not_ok
from login_required import login_required
from exceptions import SAPError
import logging

logger = logging.getLogger(__name__)

buscar_info_cotacao_blueprint = Blueprint('buscar_info_cotacao',__name__)

@buscar_info_cotacao_blueprint.route('/api/buscar_info_cotacao')
@login_required
def buscar_info_cotacao():
    DocEntry = request.args.get('DocEntry')

    if not DocEntry or not DocEntry.isdigit():
        return jsonify({"erro":"Número do documento inválido"}), 400
   
    try:
        sap = get_sap()
        endpoint = f'U_OQUT_INFO?$filter=U_DocEntry eq {DocEntry}'
        res = sap.get_endpoint(endpoint)

        if_not_ok(res)
        resultado = res.get('data', [])
        if not resultado:
            logger.error(f"Informações da Cotação {DocEntry} não encontrada")
            return jsonify([])
        logger.info(f"Informação da cotação {DocEntry} buscada com sucesso")
        return jsonify(resultado)
    
    except SAPError:
         raise
    
    except Exception as e:
        logger.exception(f"Erro ao buscar info da cotação {DocEntry}: {str(e)}")
        return jsonify({"erro": "Erro interno ao buscar cotação"}), 500


