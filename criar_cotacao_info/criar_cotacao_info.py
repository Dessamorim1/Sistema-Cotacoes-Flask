from flask import Blueprint,jsonify,request
from login_required import login_required
from tratamento_sap import if_not_ok
from exceptions import SAPError
from sap_helper import get_sap
import logging

logger = logging.getLogger(__name__)

criar_cotacao_info_blueprint = Blueprint('criar_cotacao_info',__name__)

@criar_cotacao_info_blueprint.route('/api/criar_cotacao_info',methods=['POST'])
@login_required
def criar_cotacao_info():
    dados = request.get_json()
 
    if not dados:
        return jsonify({'erro': 'Payload JSON inválido ou vazio'}),400
    
    DocEntry = dados.get("U_DocEntry")

    if not DocEntry:
        return jsonify({'erro': 'O DocEntry não pode ser inválido ou vazio'}),400
                 
    payload = {
        "Code": DocEntry,
        "Name" : DocEntry,
        "U_DocEntry" : DocEntry,
        "U_Modalidade": dados.get("U_Modalidade"),
        "U_Esfera": dados.get("U_Esfera"),
        "U_NumLicitacao": dados.get("U_NumLicitacao")
    }

    try:
        sap = get_sap()
        adicionar = sap.post_endpoint("U_OQUT_INFO", payload)
        if_not_ok(adicionar)

        logger.info(f"Informação da cotação adicionada com sucesso payload enviado {payload}")
        return jsonify({'mensagem': 'Informação da cotação adicionada com sucesso'}), 201

    except SAPError as e:
        if getattr(e, "code", None) == -2035:
            return jsonify({"erro": e.mensagem, "acao_sugerida": "PATCH"}), 409
        raise

    except Exception as e:
        logger.warning(f"Erro ao adicionar informação da cotação, erro: {str(e)}")
        return jsonify({"erro": "Erro ao adicionar informação da cotação", "detalhe": str(e)}), 500
