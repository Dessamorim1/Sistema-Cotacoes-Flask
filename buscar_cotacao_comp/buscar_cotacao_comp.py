from flask import Blueprint,jsonify,request
from sap_helper import get_sap
from tratamento_sap import if_not_ok
from login_required import login_required
from exceptions import SAPError

import logging

logger = logging.getLogger(__name__)

buscar_cotacao_comp_blueprint = Blueprint("buscar_cotacao_comp",__name__)

@buscar_cotacao_comp_blueprint.route('/api/buscar_cotacao_comp')
@login_required
def buscar_cotacao_comp():
    DocNum = request.args.get("DocNum", "").strip() 
    if not DocNum:
        return jsonify({"erro":"Número do Documento informado é inválido"}), 400
    
    try:
        DocNum_int = int(DocNum)
    except ValueError:
        return jsonify({"erro": "DocNum deve ser um número inteiro"}), 400
    
    try:
        sap = get_sap()
        res= sap.get_endpoint(f'U_OQUTCOMP?$filter=U_DocNum eq {DocNum_int}&$orderby=U_LineNum asc,U_Posicao asc',0)
        if_not_ok(res)
        resultado = res.get('data', [])

        if not resultado:
            logger.info(f"Competidores da Cotação {DocNum_int} não encontrada")
            return jsonify([])
            
        logger.info(f"Competidores da Cotação {DocNum_int} buscada com sucesso")
        return jsonify (resultado)
        
    except SAPError:   
        raise

    except Exception as e:
        logger.exception(f"Erro ao buscar competidores da cotação {DocNum_int}: {str(e)}")
        return jsonify({"erro": "Erro interno ao buscar competidores da cotação"}), 500