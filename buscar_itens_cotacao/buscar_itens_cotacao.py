from flask import Blueprint,request,jsonify
from sap_helper import get_sap
from login_required import login_required
from tratamento_sap import if_not_ok
from exceptions import SAPError

import logging

logger = logging.getLogger(__name__)

buscar_itens_cotacao_blueprint = Blueprint('buscar_itens_cotacao',__name__) 

@buscar_itens_cotacao_blueprint.route('/api/buscar_itens_cotacao')
@login_required
def buscar_itens_cotacao():
    DocNum = request.args.get('DocNum')

    if not DocNum:
        return jsonify({"erro": "Número do Documento informado é inválido"}), 400

    try:
        sap = get_sap()
        res= sap.get_endpoint(f'Quotations?$select=DocumentLines&$filter=DocNum eq {DocNum}')

        if_not_ok(res)
        resultado = res.get('data', [])

        if not resultado:
            logger.error(f"Itens da cotação {DocNum} não encontrada")
            return jsonify({"erro": "Itens da cotação não encontrada"}), 404

        linhas = resultado[0].get('DocumentLines')

        if not linhas:
            return jsonify([])

        novo_resultado = [
            {
                "LineNum": linha.get("LineNum"),
                "ItemCode": linha.get("ItemCode"),
                "ItemDescription": linha.get("ItemDescription")
            }
            for linha in linhas
        ]
        return jsonify(novo_resultado)
        
    except SAPError:   
        raise

    except Exception as e:
        logger.exception(f"Erro ao buscar itens da cotação {DocNum}: {str(e)}")
        return jsonify({"erro": "Erro interno ao buscar itens da cotação"}), 500