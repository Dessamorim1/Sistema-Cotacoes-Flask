from flask import Blueprint, request,jsonify
from sap_helper import get_sap
from login_required import login_required
from tratamento_sap import if_not_ok
from exceptions import SAPError

import logging

logger = logging.getLogger(__name__)

buscar_cotacao_blueprint = Blueprint("Buscar_Cotacao",__name__)

@buscar_cotacao_blueprint.route('/api/buscar_cotacao')
@login_required
def buscar_cotacao():
    DocNum_str = request.args.get('DocNum', '').strip()
    if not DocNum_str:
        return jsonify({"erro":"Número do documento inválido"}), 400

    try:
        DocNum = int(DocNum_str)
    except ValueError:
        return jsonify({"erro": "Número do documento inválido. Deve ser um inteiro"}), 400
    
    try:
        sap = get_sap()
        res = sap.get_endpoint(f'Quotations?$select=DocNum,DocEntry,CardCode,CardName,JournalMemo,SalesPersonCode,BPLName,ContactPersonCode,DocTotal,DocumentStatus,DocDate,TaxExtension&$filter=DocNum eq {DocNum}')
        
        if_not_ok(res)  
        resultado = res.get('data', [])

        if not resultado:
            logger.error(f"Cotação {DocNum} não encontrada")
            return jsonify({"erro" : "Cotação não encontrada"}),404
        
        # Vendedor
            
        codigo_vendedor = resultado[0].get("SalesPersonCode")   
        vendedor_payload = sap.get_endpoint(f"SalesPersons?$select=SalesEmployeeName&$filter=SalesEmployeeCode eq {codigo_vendedor}")  
        if_not_ok(vendedor_payload)
        vendedor = vendedor_payload.get('data', [])
        resultado[0]["SalesEmployeeName"] = vendedor[0].get("SalesEmployeeName")
        
        # Pessoa de Contato

        codigo_pessoa_de_contato = resultado[0].get("CardCode")
        pessoa_de_contato_payload = sap.get_endpoint(f"BusinessPartners?$select=ContactPerson&$filter=CardCode eq '{codigo_pessoa_de_contato}'")
        if_not_ok(pessoa_de_contato_payload)
        pessoa_de_contato = pessoa_de_contato_payload.get('data', [])
        resultado[0]["ContactPerson"] = pessoa_de_contato[0].get("ContactPerson")

        # Usage

        lista_tax = resultado[0].get('TaxExtension')
        codigo_main_usage = lista_tax.get('MainUsage')
        main_usage_payload = sap.get_endpoint(f'NotaFiscalUsage({codigo_main_usage})?$select=Usage')
        if_not_ok(main_usage_payload)
        main_usage = main_usage_payload.get('data', [])
        resultado[0]["Usage"] = main_usage[0].get("Usage")
        
        logger.info(f"Cotação {DocNum} buscada com sucesso")
        return jsonify (resultado) 
        
    except SAPError:   
        raise

    except Exception as e:
        logger.exception(f"Erro interno ao buscar cotação {DocNum}: {str(e)}")
        return jsonify({"erro": "Erro interno ao buscar cotação"}), 500
    

