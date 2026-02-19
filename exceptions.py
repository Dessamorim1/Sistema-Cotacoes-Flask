class SAPError(Exception):
    def __init__(self, mensagem, status_code=500,code=None):
        self.mensagem = mensagem
        self.status_code = status_code
        self.code = code          
        super().__init__(mensagem)

