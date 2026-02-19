from flask import Blueprint,jsonify,request
from sap_helper import get_sap
from login_required import login_required
from tratamento_sap import if_not_ok
from exceptions import SAPError
import logging

logger = logging.getLogger(__name__)

atualizar_info_cotacao_blueprint = Blueprint('atualizar_info_cotacao',__name__)

@atualizar_info_cotacao_blueprint.route('/api/atualizar_info_cotacao',methods=['PATCH'])
@login_required
def atualizar_info_cotacao():
    DocEntry = request.args.get('DocEntry')
    dados = request.get_json()
    if not DocEntry:
        return jsonify({"erro":"É necessário informar um DocEntry antes"}),400
    
    if not dados:
        return jsonify({'erro': 'Payload JSON inválido ou vazio'}),400
        
    payload = {
        "U_Modalidade": dados.get("U_Modalidade"),
        "U_Esfera": dados.get("U_Esfera"),
        "U_NumLicitacao": dados.get("U_NumLicitacao")
    }
    try:
        sap = get_sap()
        endpoint = f"U_OQUT_INFO('{DocEntry}')"
        atualizar = sap.patch_endpoint(endpoint,payload)
        if_not_ok(atualizar)
        
        logger.info(f"Informações da Cotação atualizado com sucesso payload enviado {payload}")
        return jsonify({'mensagem': 'Informações da Cotação atualizado com sucesso com as informações'}), 200

    except SAPError:  
        raise 

    except Exception as e:
        logger.warning(f"Erro ao atualizar informações da cotação: {e}")
        return jsonify({'erro': f'{e}'}), 500
   