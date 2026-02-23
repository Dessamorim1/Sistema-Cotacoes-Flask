// Alerta

function alerta(tipo, titulo, mensagem) {
    return Swal.fire({
        icon: tipo,
        title: titulo,
        text: mensagem,
        confirmButtonText: "Fechar",
        customClass: {
            popup: "meu-alerta-popup",
            title: "meu-alerta-titulo",
            confirmButton: "meu-alerta-botao",
        },
    });
}

document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  try {
    const formData = new FormData(this);

    const response = await fetch("/login", {
      method: "POST",
      body: formData
    });

    let data = {};
    try { data = await response.json(); } catch {}

    if (response.ok && data.ok) {
      window.location.href = "/cotacao";
      return;
    }

    alerta("error", "Falha no login", data.erro || "Não foi possível autenticar. Tente novamente.");
  } catch (err) {
    alerta("error", "Servidor indisponível", "Não foi possível conectar ao servidor. Tente novamente em instantes.");
  }
});

function toggleSenha() {
    const input = document.getElementById("senha");
    const icone = document.getElementById("iconeSenha");

    if (input.type === "password") {
        input.type = "text";
        icone.classList.remove("bi-eye-slash");
        icone.classList.add("bi-eye");
    } else {
        input.type = "password";
        icone.classList.remove("bi-eye");
        icone.classList.add("bi-eye-slash");
    }
}