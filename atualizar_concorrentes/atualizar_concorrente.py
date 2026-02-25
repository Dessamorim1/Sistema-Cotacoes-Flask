from flask import Blueprint,jsonify,request
from sap_helper import get_sap
from login_required import login_required
from exceptions import SAPError
from tratamento_sap import if_not_ok

import logging

logger = logging.getLogger(__name__)

atualizar_concorrente_blueprint = Blueprint('atualizar_concorrrente',__name__)

@atualizar_concorrente_blueprint.route('/api/atualizar_concorrente/<string:Code>', methods=['PATCH'])
@login_required
def atualizar_concorrente(Code):
    dados = request.get_json()

    if not Code:
        return jsonify({'erro': 'Código é obrigatório'}), 400
    
    if not dados:
        return jsonify({'erro': 'Payload JSON inválido ou vazio'}), 400

    linha = {
           "Code": str(Code),
           "Name": str(Code)
    }

    def add(campo):
        valor = dados.get(campo)
        if valor not in (None, ""):
            linha[campo] = valor

    for campo in [
        "U_LineNum",
        "U_ComptID",
        "U_Memo",
        "U_Won",
        "U_ThreatLevel",
        "U_Marca",
        "U_Modelo",
        "U_Quantidade",
        "U_Observacao",
        "U_Posicao",
        "U_ItemCode",
        "U_Item",
        "U_ValorUnit",
        "U_ValorTot",
    ]:
        add(campo)

    if len(linha) <= 2:
        return jsonify({"erro": "Nenhum campo para atualizar"}), 400
    
    try:
        sap = get_sap()
        endpoint = f"U_OQUTCOMP('{Code}')"
        sucesso = sap.patch_endpoint(endpoint, linha)
        if_not_ok(sucesso)
        logger.info(f"Concorrente atualizado com sucesso payload enviado {linha}")
        return jsonify({'mensagem': 'Concorrente atualizado com sucesso com as informações'}), 200
    
    except SAPError:
        raise

    except Exception as e:
        logger.warning(f"Erro ao atualizar concorrente {e}")
        return jsonify({'erro': f'{e}'}), 500