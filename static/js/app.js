let concorrentesCadastrados = [];
let itensCadastrados = [];
let nomes = [];
let CodeSelecionado = null;
let linhaSelecionada = null;
let payload = []

// Listeners

window.addEventListener('load', () => {
    carregar_concorrentes();
    GerarLinhas();
    pegar_linha();
})

document.addEventListener('DOMContentLoaded', () => {
    const unit = document.getElementById("U_ValorUnit");
    const qtd = document.getElementById("U_Quantidade");

    if (unit) unit.addEventListener("input", (e) => {
        formatarMoeda(e.target);
        calcular_total();
    });

    if (qtd) qtd.addEventListener("input", calcular_total);
});

document.getElementById('U_ValorUnit').addEventListener('keypress', e => {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
});
document.getElementById('U_ValorTot').addEventListener('keypress', e => {
    if (!/[0-9]/.test(e.key)) e.preventDefault();
});

// Toglled night and day

function toggled() {
    document.body.classList.toggle("dark");
}

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

// Mensagens erro de rede 

function mensagem_erro(err, tituloPadrao = "Erro") {
    const msg = (err && err.message) ? err.message : String(err);

    const isNetwork =
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("Load failed");

    if (isNetwork) {
        alerta('error', 'Servidor indisponível',
            'Não consegui conectar ao servidor. Verifique se o Flask está ligado, a URL/porta está correta, ou se há bloqueio (CORS/rede).');
        return;
    }

    alerta('error', tituloPadrao, msg);
}

// GerarLinhas

function GerarLinhas(qtd = 50) {
    const grid = document.getElementById("grid-concorrentes");
    if (!grid) return;

    grid.innerHTML = `
        <div>#</div>
        <div>Concorrente</div>
        <div>Grau de Ameaça</div>
        <div>Marca/Fabricante</div>
        <div>Modelo</div>
        <div>Observação</div>
        <div>Qtde</div>
        <div>V. Unitário</div>
        <div>V. Total</div>
        <div>Posição</div>
        <div>Item Safe</div>
    `;

    for (let i = 0; i < qtd; i++) {
        grid.insertAdjacentHTML("beforeend", `
            <div><input type="hidden" class="rowno" readonly value="${i + 1}" /></div>
            <div>
                <select class="grid-select concorrente-select">
                    <option value=""></option>
                </select>
            </div>
            <div>
                <select class="grid-select">
                    <option value=""></option>
                    <option value="Low">Baixo</option>
                    <option value="Medium">Médio</option>
                    <option value="High">Alto</option>
                </select>
            </div>
            <div><input type="text" class="marca" /></div>
            <div><input type="text" class="modelo" /></div>
            <div><input type="text" class="observacao" /></div>
            <div><input type="number" class="quantidade" /></div>
            <div><input type="text" class="valor-unitario" /></div>
            <div><input type="text" class="valor-total" /></div>
            <div><input type="number" class="posicao" /></div>
            <div><select class="items-safe">
                <option value=""></option>
                </select>
            </div>
        `);
    }
}

// Requisições GET

// Selects

async function carregar_concorrentes() {
    fetch('/api/buscar_concorrentes')
        .then(res => res.json())
        .then(lista => {
            concorrentesCadastrados = lista;
            nomes = lista.map(c => c.Name);

            const concorrente = document.getElementById("concorrente");
            if (!concorrente) return;

            concorrente.innerHTML = '<option value="">Selecione</option>';
            lista.forEach(c => {
                const option = document.createElement("option");
                option.value = c.SequenceNo;
                option.text = c.Name;
                concorrente.appendChild(option);
            });
            const optionNew = document.createElement("option");
            optionNew.value = "novo";
            optionNew.text = "Definir Novo";
            concorrente.appendChild(optionNew);

            concorrente.addEventListener("change", function () {
                if (this.value === "novo") {
                    this.value = "";
                    abrirModal();
                }
            })
        })
        .catch(() => {
            alerta('error', 'Erro ao carregar competidores', 'Não foi possível carregar a lista de competidores. Por favor, tente novamente mais tarde.');
        });
}

async function carregar_itens(DocNum) {
    try {
        const response = await fetch(`/api/buscar_itens_cotacao?DocNum=${encodeURIComponent(DocNum)}`);

        if (!response.ok) {
            throw new Error('Erro ao buscar itens da cotação');
        }

        const lista = await response.json();
        itensCadastrados = lista;
        console.log(itensCadastrados)

        const itens = document.getElementById("ItemCotacao");
        if (!itens) return;
        itens.innerHTML = '<option value="">Selecione</option>';
        lista.forEach(c => {
            const option = document.createElement("option");
            option.value = c.LineNum;
            option.textContent = c.ItemDescription;
            itens.appendChild(option);
        });

    } catch (err) {
        alerta(
            'error',
            'Erro ao carregar itens',
            err.message || 'Não foi possível carregar os itens da cotação.'
        );
    }
}


// Buscar Cotação

async function buscar_cotacao() {
    const DocNum = document.getElementById("DocNum").value;

    if (!DocNum) {
        alerta('info', "Atenção", "É necessário informar o número da cotação");
        return;
    }

    try {
        const response = await apiFetchJson(`/api/buscar_cotacao?DocNum=${encodeURIComponent(DocNum)}`);
        if (!response) return;

        const elemento = response[0];

        document.getElementById("CardName").value = elemento.CardName || 'Desconhecido';
        document.getElementById("SalesPerson").value = elemento.SalesEmployeeName || 'Desconhecido';
        document.getElementById("CardCode").value = elemento.CardCode || '';
        document.getElementById("JournalMemo").value = elemento.JournalMemo || '';
        document.getElementById("Status").value = elemento.DocumentStatus || '';
        document.getElementById("DocDate").value = elemento.DocDate || '';
        document.getElementById("BPLName").value = elemento.BPLName || '';
        document.getElementById("ContactPersonCode").value = elemento.ContactPerson || '';
        document.getElementById("DocTotal").value = formatarMoedaParaExibicao(elemento.DocTotal) || '';
        document.getElementById("DocEntry").value = elemento.DocEntry || '';
        document.getElementById("MainUsage").value = elemento.Usage || '';

        await carregar_itens(DocNum);
        buscar_info_cotacao(document.getElementById("DocEntry").value);
        buscar_linhas_cotacao(DocNum);

    } catch (err) {
        mensagem_erro(err, "Erro ao buscar Cotação")
    }
}

// Buscar Linhas Cotações

async function buscar_linhas_cotacao(DocNum) {
    DocNum = String(DocNum ?? '').trim();

    const linhas = document.querySelectorAll(".concorrentes-grid div input, .concorrentes-grid div select");

    for (let i = 0; i < linhas.length; i += 11) {
        const camposLinha = Array.from(linhas).slice(i, i + 11);

        camposLinha[0].value = "";
        camposLinha[1].innerHTML = '<option value=""></option>';
        camposLinha[2].innerHTML = '<option value=""></option><option value="Low">Baixo</option><option value="Medium">Médio</option><option value="High">Alto</option>';
        for (let j = 3; j < 10; j++) {
            if (camposLinha[j]) camposLinha[j].value = "";
        }
        camposLinha[10].value = '<option value=""></option>';
    }

    try {
        const res = await fetch(`/api/buscar_cotacao_comp?DocNum=${encodeURIComponent(DocNum)}`);
        if (!res.ok) {
            let errData = {};
            try { errData = await res.json(); } catch { }
            throw new Error(errData.erro || 'Erro desconhecido');
        }

        const dados = await res.json();
        if (dados.length === 0) {
            if (dados.length === 0) {
                const lista = Array.from(linhas);
                lista.forEach(campo => {
                    if (campo.tagName === 'SELECT') {
                        campo.innerHTML = '';
                        campo.value = '';
                    } else {
                        campo.value = '';
                    }
                });
                return;
            }
        }
        const lista = Array.from(linhas);
        for (let i = 0; i < dados.length; i++) {
            const campos = lista.slice(i * 11, (i + 1) * 11);
            if (campos.length < 11) break;
            const c = dados[i] || {};

            campos[0].value = c.Code

            const select = campos[1];
            select.innerHTML = '';
            concorrentesCadastrados.forEach(cOpt => {
                const opt = document.createElement("option");
                opt.value = cOpt.SequenceNo;
                opt.text = cOpt.Name;
                select.appendChild(opt);
            });

            const optionSelecionada = Array.from(select.options).find(opt => Number(opt.value) === Number(c.U_ComptID));
            select.value = optionSelecionada ? optionSelecionada.value : "";

            campos[2].value = c.U_ThreatLevel || '';
            campos[3].value = c.U_Marca || '';
            campos[4].value = c.U_Modelo || '';
            campos[5].value = c.U_Observacao || '';
            campos[6].value = c.U_Quantidade || '';
            campos[7].value = formatarMoedaParaExibicao(c.U_ValorUnit) || '';
            campos[8].value = formatarMoedaParaExibicao(c.U_ValorTot) || '';
            campos[9].value = c.U_Posicao || '';

            const itemSelect = campos[10];
            itemSelect.innerHTML = '';
            itensCadastrados.forEach(dOpt => {
                const optItem = document.createElement("option");
                optItem.value = dOpt.LineNum;
                optItem.text = dOpt.ItemDescription;
                itemSelect.appendChild(optItem);
            });
            console.log("to chegando aq assim: ", itensCadastrados)
            const optionItem = Array.from(itemSelect.options).find(opt1 => Number(opt1.value) === Number(c.U_LineNum));
            itemSelect.value = optionItem ? optionItem.value : "";

        }

    } catch (err) {
        alerta('error', 'Erro ao buscar Competidores da Cotação', err.message);
    }
}

// Buscar informações da cotação

async function buscar_info_cotacao(DocEntry) {
    if (!DocEntry) {
        alerta('info', "Atenção", "É necessário informar o número do DocEntry");
        return;
    }

    try {
        const response = await fetch(`/api/buscar_info_cotacao?DocEntry=${encodeURIComponent(DocEntry)}`);

        if (!response.ok) {
            let errData = {};
            try { errData = await response.json(); } catch { }
            throw new Error(errData.erro || 'Erro desconhecido');
        }

        const dados = await response.json();
        if (dados.length === 0) {
            limpar_campos_info();
            return;
        }
        const elemento = dados[0]

        document.getElementById("U_Modalidade").value = elemento.U_Modalidade || '';
        document.getElementById("U_Esfera").value = elemento.U_Esfera || '';
        document.getElementById("U_NumLicitacao").value = elemento.U_NumLicitacao || '';


    }
    catch (err) {
        alerta('error', 'Erro ao buscar Informações da Cotação', err.message);
    }
}

// Atualizar Informações da Cotação

async function atualizar_cotacao() {
    const DocNum = document.getElementById("DocNum").value;
    const DocEntry = document.getElementById("DocEntry").value;

    if (!DocNum) {
        await alerta('warning', 'Nenhuma cotação selecionada', 'Você precisa buscar uma cotação primeiro.');
        return;
    }

    if (!DocEntry) {
        await alerta('warning', 'Nenhuma cotação selecionada', 'Você precisa buscar uma cotação primeiro.');
        return;
    }

    const payload = {
        U_Modalidade: document.getElementById("U_Modalidade").value,
        U_Esfera: document.getElementById("U_Esfera").value,
        U_NumLicitacao: document.getElementById("U_NumLicitacao").value
    };

    try {
        const resp = await apiFetch(`/api/atualizar_info_cotacao?DocEntry=${DocEntry}`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }
        );

        if (!resp) return;

        let res = null;
        try { res = await resp.json(); } catch { }

        if (!resp.ok) {
            throw new Error(res?.erro || res?.message || "Erro ao atualizar informações da cotação");
        }

        await alerta('success', 'Sucesso', "Informações da Cotação atualizada com sucesso");

    } catch (err) {
        mensagem_erro(err, 'Erro ao atualizar informações da cotação');
        console.error(err);
    }
}

// Criar Competidor + Modal

function abrirModal() {
    document.getElementById("modalConcorrente").style.display = "flex";
}

function fecharModal() {
    document.getElementById("modalConcorrente").style.display = "none";
}

async function criarConcorrente() {
    const input = document.getElementById("nomeCompetidor");
    const nome = input.value.trim();
    const nomeDigitado = nome.toLowerCase();

    if (!nome) {
        await alerta('error', 'Nome do Concorrente não informado', 'Você precisa informar um nome válido.');
        return;
    }

    if (nome.length > 15) {
        await alerta('error', 'Nome do Concorrente ultrapassa 15 caracteres', 'Informe um nome menor ou igual a 15 caracteres.');
        return;
    }

    for (let i = 0; i < nomes.length; i++) {
        if (nomeDigitado === nomes[i].trim().toLowerCase()) {
            await alerta('info', 'Concorrente já cadastrado', 'Este nome de concorrente já existe, tente um novo.');
            return;
        }
    }

    try {
        const data = await apiFetchJson('/api/criar_competidores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ novoConcorrenteNome: { Name: nome } })
        });

        if (!data) return; // sessão expirada

        await alerta('success', 'Concorrente adicionado com sucesso', 'Você já pode usar o novo concorrente cadastrado.');
        input.value = "";
        fecharModal();
        carregar_concorrentes();

    } catch (err) {
        await alerta('error', 'Erro ao adicionar concorrente', err.message || 'Verifique os dados e tente novamente.');
        console.error(err);
    }
}

// Criar Concorrente

// parseValorBR

async function criar_concorrente() {
    const DocNum = document.getElementById("DocNum").value;
    const btn = document.getElementById("btnadd");
    btn.disabled = true;

    try {
        if (!DocNum) {
            alerta('info', "Atenção", "É necessário informar o número da cotação");
            btn.disabled = false;
            return;
        }

        const concorrente_id = document.getElementById("concorrente").value.trim();
        const ameaca = document.getElementById("U_ThreatLevel").value
        if (!concorrente_id) {
            alerta('warning', 'Campo concorrente obrigatório', 'Por favor, selecione um concorrente.');
            btn.disabled = false;
            return;
        }
        if (!ameaca) {
            alerta('warning', 'Campo Ameaça obrigatório', 'Por favor, selecione o grau de ameaça.');
            btn.disabled = false;
            return;
        }

        const quantidade = Number(document.getElementById("U_Quantidade").value);
        const valorUnit = parseValorBR(document.getElementById("U_ValorUnit").value);
        const valorTot = parseValorBR(document.getElementById("U_ValorTot").value);
        const posicao = Number(document.getElementById("U_Posicao").value);

        if (isNaN(quantidade) || quantidade <= 0 || !Number.isInteger(quantidade)) {
            alerta('warning', 'Quantidade inválida', 'Digite uma quantidade válida.');
            btn.disabled = false;
            return;
        }

        if (isNaN(posicao) || posicao <= 0 || !Number.isInteger(posicao)) {
            alerta('warning', 'Posição inválida', 'Digite um valor de posição válida.');
            btn.disabled = false;
            return;
        }

        if (isNaN(valorUnit) || valorUnit <= 0) {
            alerta('warning', 'Valor Unitário inválido', 'Digite um valor unitário válido.');
            btn.disabled = false;
            return;
        }

        if (isNaN(valorTot) || valorTot <= 0) {
            alerta('warning', 'Valor Total inválido', 'Digite um valor total válido.');
            btn.disabled = false;
            return;
        }

        const itemValue = document.getElementById("ItemCotacao").value;

        if (itemValue === "") {
            alerta('warning', 'Item obrigatório', 'Selecione o item da cotação.');
            btn.disabled = false;
            return;
        }

        const lineNum = Number(itemValue);

        const concorrente = {
            U_DocNum: DocNum,
            U_LineNum: lineNum,
            U_ComptID: Number(concorrente_id),
            U_ThreatLevel: document.getElementById("U_ThreatLevel").value.trim(),
            U_Marca: document.getElementById("U_Marca").value.trim(),
            U_Modelo: document.getElementById("U_Modelo").value.trim(),
            U_Quantidade: quantidade,
            U_Observacao: document.getElementById("U_Observacao").value.trim(),
            U_Posicao: posicao,
            U_ValorUnit: valorUnit,
            U_ValorTot: valorTot
        }
        const data = await apiFetchJson('/api/criar_concorrente', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(concorrente)
        });

        if (!data) return;

        await alerta('success', 'Concorrente adicionado', data.mensagem || 'Concorrente foi adicionado com sucesso!');
        limpar_campos();
        buscar_linhas_cotacao(DocNum);

    } catch (err) {
        mensagem_erro(err, 'Erro ao adicionar concorrente');
        console.error(err);

    } finally {
        btn.disabled = false;
    }
}

// Atualizar Concorrente + Configuração de linha

function pegar_linha() {
    const linhas = document.querySelector(".concorrentes-grid");
    const linha = Array.from(linhas.children);

    for (let i = 11; i < linha.length; i += 11) {
        payload.push(linha.slice(i, i + 11));
    }

    payload.forEach(linha => {
        const qtdInput = linha[6].querySelector("input");
        const unitInput = linha[7].querySelector("input");
        const totInput = linha[8].querySelector("input");

        if (unitInput) {
            unitInput.addEventListener("input", (e) => {
                formatarMoeda(e.target);
                calcular_total_linha(linha);
            });
        }

        if (qtdInput) {
            qtdInput.addEventListener("input", () => calcular_total_linha(linha));
        }

        if (totInput) {
            totInput.readOnly = true;
        }
    });


    linhas.addEventListener("click", (event) => {
        const divLinha = event.target.closest("div");
        if (!divLinha) return;

        const linhaClicada = payload.find(c => c.includes(divLinha));
        if (!linhaClicada) return;

        payload.forEach(c =>
            c.forEach(div => {
                div.classList.remove("linha-selecionada");
                div.querySelectorAll("input,select").forEach(el => {
                    el.classList.remove("linha-selecionada-campo");
                });
            })
        );

        linhaClicada.forEach(div => {
            div.classList.add("linha-selecionada");
            div.querySelectorAll("input,select").forEach(el => {
                el.classList.add("linha-selecionada-campo");
            });
        });

        const codigo = linhaClicada[0].querySelector("input.rowno");
        CodeSelecionado = codigo ? codigo.value : null;

        const linhaS = payload.find(linhaS => {
            const inputCode = linhaS[0].querySelector("input.rowno");
            return inputCode && inputCode.value == CodeSelecionado;
        });

        if (!linhaS) {
            return alerta('error', 'Erro', 'Linha do concorrente não encontrada.');
        }

        linhaSelecionada = linhaClicada;

    }
    )
}

async function atualizar_concorrente() {
    const DocNum = document.getElementById("DocNum").value

    if (!DocNum) {
        alerta('info', 'Nenhuma oportunidade selecionada', 'Você precisa buscar uma oportunidade primeiro.');
        return;
    }

    if (!linhaSelecionada) {
        return alerta(
            'warning',
            'Linha inválida',
            'Selecione novamente a linha do concorrente.'
        );
    }

    const lineValue = linhaSelecionada[10].querySelector("select").value;

    if (lineValue === "") {
        await alerta('warning', 'Item obrigatório', 'Selecione o item da cotação.');
        return;
    }

    let concorrenteAtualizado;
    try {
        concorrenteAtualizado = {
            U_ComptID: linhaSelecionada[1].querySelector("select").value,
            U_ThreatLevel: linhaSelecionada[2].querySelector("select").value,
            U_Marca: linhaSelecionada[3].querySelector("input").value.trim(),
            U_Modelo: linhaSelecionada[4].querySelector("input").value.trim(),
            U_Observacao: linhaSelecionada[5].querySelector("input").value.trim(),
            U_Quantidade: validarNumero(linhaSelecionada[6].querySelector("input"), "Quantidade"),
            U_ValorUnit: validarNumero(linhaSelecionada[7].querySelector("input"), "Valor Unitário"),
            U_ValorTot: validarNumero(linhaSelecionada[8].querySelector("input"), "Valor Total"),
            U_Posicao: validarNumero(linhaSelecionada[9].querySelector("input"), "Posição"),
            U_LineNum: Number(lineValue)

        };

    } catch (err) {
        await alerta('warning', 'Campo inválido', err.message);
        return;
    }
    try {
        const resp = await apiFetch(`/api/atualizar_concorrente/${CodeSelecionado}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(concorrenteAtualizado)
        })
        if (!resp) return;

        let data = null;
        try { data = await resp.json(); } catch { }

        if (!resp.ok) {
            throw new Error(data?.erro || data?.message || "Erro ao atualizar");
        }

        await alerta('success', 'Sucesso', data?.mensagem || "Concorrente atualizado com sucesso!");

        CodeSelecionado = null;
        linhaSelecionada = null;

        payload.forEach(linha =>
            linha.forEach(div => {
                div.classList.remove("linha-selecionada");
                div.querySelectorAll("input, select").forEach(el => {
                    el.classList.remove("linha-selecionada-campo");
                });
            })
        );

        buscar_linhas_cotacao(DocNum);

    } catch (err) {
        mensagem_erro(err, 'Erro ao atualizar concorrente');
        console.error(err);
    }
}

function validarNumero(input, nomeCampo) {
    const valor = parseValorBR(input.value)
    if (isNaN(valor) || valor <= 0) {
        throw new Error(`Campo "${nomeCampo}" inválido. Informe um número maior que 0.`);
    }
    return valor;
}

// Adicionar informações da Cotação

async function adicionar_info_cotacao() {
    const DocNum = document.getElementById("DocNum").value;
    const DocEntry = document.getElementById("DocEntry").value;

    if (!DocNum) {
        await alerta('warning', 'Nenhuma cotação selecionada', 'Você precisa buscar uma cotação primeiro.');
        return;
    }

    if (!DocEntry) {
        await alerta('warning', 'Nenhum DocEntry informado', 'É preciso informar um DocEntry primeiro.');
        return;
    }

    const payload = {
        Code: DocEntry,
        Name: DocEntry,
        U_DocEntry: DocEntry,
        U_Modalidade: document.getElementById("U_Modalidade").value,
        U_Esfera: document.getElementById("U_Esfera").value,
        U_NumLicitacao: document.getElementById("U_NumLicitacao").value
    };

    try {
        const resp = await apiFetch("/api/criar_cotacao_info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!resp) return;
        if (resp.status === 409) {
            await atualizar_cotacao();
            return;
        }

        let res = null;
        try { res = await resp.json(); } catch { }

        if (!resp.ok) {
            throw new Error(res?.erro || res?.message || `Erro HTTP ${resp.status}`);
        }

        await alerta('success', 'Sucesso', "Informações da Cotação adicionadas com sucesso");

    } catch (err) {
        mensagem_erro(err, 'Erro ao adicionar informações da cotação');
        console.error(err);
    }
}

// Formatar Moedas

function formatarMoedaParaExibicao(valor) {
    if (valor == null) return '';
    let v = Number(valor).toFixed(2).replace('.', ',');
    v = v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return v;
}

function formatarMoeda(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = (valor / 100).toFixed(2) + '';
    valor = valor.replace('.', ',');
    valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = valor;
}

function parseValorBR(valor) {
    if (!valor) return null;
    return parseFloat(valor.replace(/\./g, '').replace(',', '.'));
}

//Limpar campos

function limpar_campos() {
    const campos = ["concorrente", "U_ThreatLevel", "U_Marca", "U_Modelo", "U_Observacao", "U_Quantidade", "U_ValorUnit", "U_ValorTot", "U_Posicao", "U_LineNum", "ItemCotacao"]
    campos.forEach(id => {
        const elemento = document.getElementById(id);
        if (!elemento) return;
        elemento.value = "";
    });
}

function limpar_campos_info() {
    const campos = ["U_Modalidade", "U_Esfera", "U_NumLicitacao"]
    campos.forEach(id => {
        const elemento = document.getElementById(id);
        if (!elemento) return;
        elemento.value = "";
    })
}

function calcular_total() {
    const quantidade = Number(document.getElementById("U_Quantidade").value) || 0;

    const valorUnit = parseValorBR(document.getElementById("U_ValorUnit").value) || 0;

    const total = quantidade * valorUnit;

    const inputValorTot = document.getElementById("U_ValorTot");
    inputValorTot.value = formatarMoedaParaExibicao(total);
}

function calcular_total_linha(linha) {
    const qtdInput = linha[6].querySelector("input");
    const unitInput = linha[7].querySelector("input");
    const totInput = linha[8].querySelector("input");

    if (!qtdInput || !unitInput || !totInput) return;

    const qtd = Number(qtdInput.value) || 0;
    const unit = parseValorBR(unitInput.value) || 0;

    const total = qtd * unit;
    totInput.value = formatarMoedaParaExibicao(total);
}

async function apiFetchJson(url, options = {}) {
    const res = await fetch(url, { credentials: "same-origin", ...options });

    if (res.status === 401) {
        await alerta('error', "Sessão expirada", "Faça login novamente.");
        window.location.href = "/";
        return null;
    }

    let data = null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) {
        data = await res.json();
    } else {
        const txt = await res.text();
        data = txt ? { message: txt } : null;
    }

    if (!res.ok) {
        throw new Error(data?.erro || data?.message || `Erro HTTP ${res.status}`);
    }

    return data;
}

async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, {
            credentials: "same-origin",
            ...options
        });

        if (response.status === 401) {
            await alerta('error', "Sessão expirada", "Faça login novamente.");
            window.location.href = "/";
            return null;
        }

        return response;

    } catch (err) {
        console.error("Erro de rede:", err);
        throw err;
    }
}

// Botão Logout

async function chamar_logout() {

    const confirmacao = await Swal.fire({
        icon: "question",
        title: "Deseja sair?",
        text: "Sua sessão será encerrada.",
        showCancelButton: true,
        confirmButtonText: "Sair",
        cancelButtonText: "Cancelar",

        customClass: {
            popup: "logout-popup"
        }
    });

    if (!confirmacao.isConfirmed) return;

    const response = await fetch("/logout", {
        method: "POST"
    });

    let data = {};
    try {
        data = await response.json();
    } catch { }

    if (response.ok && data.ok) {
        window.location.href = "/";
    } else {
        Swal.fire("Erro", "Não foi possível encerrar a sessão.", "error");
    }
}


