from flask import Blueprint, jsonify, request
from sap_helper import get_sap
from tratamento_sap import if_not_ok
from exceptions import SAPError
from login_required import login_required
import logging

logger = logging.getLogger(__name__)

criar_concorrentes_blueprint = Blueprint('criar_concorrrentes', __name__)

@criar_concorrentes_blueprint.route('/api/criar_concorrente', methods=['POST'])
@login_required
def criar_concorrente():
    dados = request.get_json()

    if not dados:
        return jsonify({"erro": "Dados dos concorrentes são obrigatórios"}), 400

    linha = {}

    def add(campo):
        valor = dados.get(campo)
        if valor not in (None, ""):
            linha[campo] = valor

    for campo in [
        "U_LineNum",
        "U_ComptID",
        "U_Memo",
        "U_ThreatLevel",
        "U_Marca",
        "U_Modelo",
        "U_Quantidade",
        "U_Observacao",
        "U_Posicao",
        "U_ValorUnit",
        "U_ValorTot",
        "U_DocNum",
        "U_ItemCode"
    ]:
        add(campo)

    if "U_DocNum" in linha:
        linha["U_DocNum"] = str(linha["U_DocNum"]).strip()

    try:
        sap = get_sap()
        cod = sap.get_endpoint("U_OQUTCOMP?$select=Code",0)
        if_not_ok(cod)
        codigos = cod.get('data', [])

        if not codigos:
            proximo = 1
        else:
            proximo = max(int(c["Code"]) for c in codigos) + 1

        linha["Code"] = str(proximo)
        linha["Name"] = str(proximo)

        payload = linha

        resp = sap.post_endpoint("U_OQUTCOMP", payload)
        if_not_ok(resp)
        logger.info(f"Concorrente criado com sucesso. status={resp['status_code']} payload={payload}")
        return jsonify({"mensagem": "Concorrente criado com sucesso","retorno": resp["data"]}), 201
    
    except SAPError:  
        raise 
            
    except Exception as e:
        logger.exception("Erro interno ao criar concorrente")
        return jsonify({"erro": str(e)}), 500
