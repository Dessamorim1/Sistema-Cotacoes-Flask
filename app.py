from flask import Flask,render_template,request,url_for,redirect,session,jsonify
from login_required import login_required
import os

from dotenv import load_dotenv
from waitress import serve
from datetime import timedelta
from exceptions import SAPError
from tratamento_sap import traducao_mensagem_erro

from atualizar_concorrentes.atualizar_concorrente import atualizar_concorrente_blueprint
from atualizar_info_cotacao.atualizar_info_cotacao import atualizar_info_cotacao_blueprint

from buscar_cotacao.buscar_cotacao import buscar_cotacao_blueprint
from buscar_cotacao_comp.buscar_cotacao_comp import buscar_cotacao_comp_blueprint
from buscar_itens_cotacao.buscar_itens_cotacao import buscar_itens_cotacao_blueprint
from buscar_concorrentes.buscar_concorrentes import buscar_concorrentes_blueprint
from buscar_info_cotacao.buscar_info_cotacao import buscar_info_cotacao_blueprint

from criar_competidores.criar_competidores import criar_competidores_blueprint
from criar_concorrente.criar_concorrentes import criar_concorrentes_blueprint
from criar_cotacao_info.criar_cotacao_info import criar_cotacao_info_blueprint

import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [%(name)s] %(message)s',
    handlers=[
        logging.FileHandler("app.log", encoding="utf-8"), 
        logging.StreamHandler() 
    ]
)

logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")
app.permanent_session_lifetime = timedelta(minutes=30)

app.register_blueprint(atualizar_concorrente_blueprint)
app.register_blueprint(atualizar_info_cotacao_blueprint)

app.register_blueprint(buscar_cotacao_blueprint)
app.register_blueprint(buscar_cotacao_comp_blueprint)
app.register_blueprint(buscar_itens_cotacao_blueprint)
app.register_blueprint(buscar_concorrentes_blueprint)
app.register_blueprint(buscar_info_cotacao_blueprint)

app.register_blueprint(criar_competidores_blueprint)
app.register_blueprint(criar_concorrentes_blueprint)
app.register_blueprint(criar_cotacao_info_blueprint)

@app.before_request
def refresh_session():
    if session.get("user_ok"):
        session.permanent = True
        session.modified = True

@app.errorhandler(SAPError)
def handle_sap_error(e):
    msg = traducao_mensagem_erro(e.code, e.mensagem)

    return jsonify({"erro": msg,"code": e.code}), e.status_code

@app.route('/')
def home():
    if session.get("user_ok"):
        return redirect(url_for("cotation_page"))
    return render_template('login.html')

@app.route('/cotacao')
@login_required
def cotation_page():
    return render_template('index.html')

@app.route('/login', methods=['POST'])
def login():
    user = request.form.get('app_user')
    passw = request.form.get('app_pass')

    if user == os.getenv('APP_USER') and passw == os.getenv('APP_PASS'):
        session.clear()
        session.permanent = True
        session["user_ok"] = True
        return jsonify({"ok": True})

    return jsonify({"ok": False, "erro": "Usuário ou senha inválidos"}), 401

@app.route('/logout',methods=['POST'])
@login_required
def logout():
    session.clear()
    return jsonify({"ok": True})

if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=8000)
