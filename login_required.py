from functools import wraps
from flask import request, session, redirect, url_for, jsonify

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("user_ok"):
            if request.path.startswith("/api/"):
                return jsonify({"erro": "Sessão expirada", "code": "SESSION_EXPIRED"}), 401
            return redirect(url_for("home"))
        return f(*args, **kwargs)
    return wrapper