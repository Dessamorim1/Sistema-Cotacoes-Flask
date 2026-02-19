from flask import Blueprint, jsonify, request
from login_required import login_required
from tratamento_sap import if_not_ok
from sap_helper import get_sap
from exceptions import SAPError
import logging

logger = logging.getLogger(__name__)

criar_competidores_blueprint = Blueprint('criar_competidores', __name__)

@criar_competidores_blueprint.route('/api/criar_competidores', methods=['POST'])
@login_required
def criar_nome_concorrente():
    dados = request.get_json() or {}
    novo = dados.get("novoConcorrenteNome")

    if not isinstance(novo, dict):
        return jsonify({'erro': 'Dados inválidos'}), 400

    if "Name" not in novo or not str(novo["Name"]).strip():
        return jsonify({'erro': "Campo 'Name' é obrigatório"}), 400

    novo_nome = str(novo["Name"]).strip()

    if len(novo_nome) > 15:
        logger.warning(f"Nome do concorrente ultrapassou 15 caracteres: {novo_nome}")
        return jsonify({'erro': 'Nome do concorrente ultrapassa 15 caracteres'}), 400

    try:
        sap = get_sap()      
        resp = sap.post_endpoint("SalesOpportunityCompetitorsSetup", {"Name": novo_nome})
        if_not_ok(resp)
        
        logger.info(f"Concorrente criado com sucesso. status={resp['status_code']} retorno={resp['data']} nome={novo_nome}")
        return jsonify({'mensagem': 'Concorrente criado com sucesso', 'retorno': resp["data"]}), 201
    
    except SAPError:   
        raise

    except Exception as e:
        logger.exception("Erro interno ao criar nome do concorrente")
        return jsonify({"erro": str(e)}), 500