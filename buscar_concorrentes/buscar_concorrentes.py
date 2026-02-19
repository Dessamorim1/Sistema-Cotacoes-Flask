from flask import Blueprint,jsonify
from sap_helper import get_sap
from login_required import login_required
from tratamento_sap import if_not_ok
from exceptions import SAPError

import logging

logger = logging.getLogger(__name__)

buscar_concorrentes_blueprint = Blueprint('buscar_concorrentes',__name__)

@buscar_concorrentes_blueprint.route('/api/buscar_concorrentes')
@login_required
def buscar_concorrentes():
    try:
        sap = get_sap()
        res = sap.get_endpoint("SalesOpportunityCompetitorsSetup?$select=SequenceNo,Name",0)
        if_not_ok(res)
        resultado = res.get('data', [])
        
        if not resultado:
            logger.warning("Nenhum competidor encontrado")
            return jsonify({"erro": "Nenhum competidor encontrado"}), 404
        
    except SAPError:   
        raise
    
    except Exception as e:
        logger.exception(f"Erro interno: {str(e)}")
        return jsonify({"erro": "Erro interno"}), 500
    
    logger.info("Competidores retornados com sucesso")
    return jsonify (resultado),200