let concorrentesCadastrados = [];
let itensCadastrados = [];
let codigosItens = [];
let nomes = [];
let CodeSelecionado = null;
let linhaSelecionada = null;
let payload = [];
let itensFora_cotacao = [];

// Listeners

document.addEventListener('DOMContentLoaded', () => {

    // Carregamentos iniciais
    carregar_concorrentes();
    GerarLinhas();
    pegar_linha();

    // Elementos
    const unit = document.getElementById("U_ValorUnit");
    const qtd = document.getElementById("U_Quantidade");
    const total = document.getElementById("U_ValorTot");

    // Eventos
    if (unit) {
        unit.addEventListener("input", (e) => {
            formatarMoeda(e.target);
            calcular_total();
        });

        unit.addEventListener("keypress", (e) => {
            if (!/[0-9]/.test(e.key)) e.preventDefault();
        });
    }

    if (qtd) {
        qtd.addEventListener("input", calcular_total);
    }

    if (total) {
        total.addEventListener("keypress", (e) => {
            if (!/[0-9]/.test(e.key)) e.preventDefault();
        });
    }

});

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
    const tbody = document.getElementById("grid-concorrentes");
    if (!tbody) return;

    tbody.innerHTML = "";

    for (let i = 0; i < qtd; i++) {
        tbody.insertAdjacentHTML("beforeend", `
            <tr>
                <td class="rowno">${i + 1}</td>

                <td>
                    <select class="form-select form-select-sm Concorrente_grid">
                        <option value=""></option>
                    </select>
                </td>

                <td>
                    <select class="form-select form-select-sm ThreatLevel_grid">
                        <option value=""></option>
                        <option value="tlLow">Baixo</option>
                        <option value="tlMedium">Médio</option>
                        <option value="tlHigh">Alto</option>
                    </select>
                </td>

                <td><input type="text" class="Marca_grid from-control form-control-sm" /></td>
             
                <td><input type="text" class="Modelo_grid form-control form-control-sm" /></td>

                <td><input type="number" class="Qtde_grid form-control form-control-sm" /></td>

                <td><input type="text" class="ValorUnit_grid form-control form-control-sm" /></td>

                <td class="ValorTot_grid"></td>

                <td><input type="number" class="Pos_grid form-control form-control-sm" /></td>

                <td>
                    <select class="form-select form-select-sm items-safe">
                        <option value=""></option>
                    </select>
                </td>

                <td class="cotacao item-fora" style="display:flex; gap:4px; align-items:center;">
                <input type="text" class="nome-item form-control form-control-sm" readonly />
                <button type="button" onclick="abrirModalItemSafe(this)"><i class="ph ph-arrow-right"
                style="color: #ecd713"></i></button>
                </td>
            </tr>
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

        const itens = document.getElementById("ItemCotacao");
        const modal = document.getElementById("itens-session");

        if (!itens || !modal) return;
        itens.innerHTML = '<option value="">Selecione</option>';

        lista.forEach(c => {
            const option = document.createElement("option");
            console.log(c);
            option.value = c.LineNum;
            option.textContent = c.ItemDescription;
            itens.appendChild(option);
        });

        const optionNew = document.createElement("option");
        optionNew.value = "999";
        optionNew.textContent = "Item fora da cotação";
        itens.appendChild(optionNew);

        itens.onchange = function () {
            if (this.value === "999") {
                modal.style.display = "block";

                carregar_filtro_itens("U_FOC_GRP", (code) => {
                    carregarItensFiltradosGenerico("Item_Filtrado", code);
                });

            } else {
                modal.style.display = "none";
            }
        };

    } catch (err) {
        alerta(
            'error',
            'Erro ao carregar itens',
            err.message || 'Não foi possível carregar os itens da cotação.'
        );
    }
}

async function carregar_filtro_itens(selectId, onChangeCallback) {
    try {
        const response = await fetch('/api/buscar_filtro_itens');

        if (!response.ok) {
            throw new Error('Erro ao buscar itens da cotação');
        }

        const lista = await response.json();

        const itens = document.getElementById(selectId);
        if (!itens) return;

        const $itens = $(itens);

        $itens.off('change');
        $itens.empty().append('<option value="">Selecione</option>');

        lista.forEach(c => {
            const option = new Option(c.Name, c.Code, false, false);
            itens.appendChild(option);
        });

        $itens.val(null).trigger('change');

        if (onChangeCallback) {
            $itens.on("change", function () {
                onChangeCallback(this.value);
            });
        }

    } catch (err) {
        alerta(
            'error',
            'Erro ao carregar itens',
            err.message || 'Não foi possível carregar o filtro de itens da cotação.'
        );
    }
}

// ===== Carrega itens filtrados =====

async function carregarItensFiltradosGenerico(selectId, code, inputAtivo = null) {
    const $select = $('#' + selectId);
    $select.empty().append('<option>Carregando...</option>');

    if (!code) {
        $select.empty().append('<option value="">Selecione</option>');
        if ($select.hasClass("select2-hidden-accessible")) $select.val('').trigger('change');
        return;
    }

    try {
        const lista = await apiFetchJson(
            `/api/buscar_itens_filtrados?U_FOC=${encodeURIComponent(code)}`
        );
        if (!lista) return;

        todos_itens_safe = lista;

        $select.empty().append('<option value="">Selecione</option>');

        if (!Array.isArray(lista) || lista.length === 0) {
            $select.append('<option value="">Nenhum item</option>');
            if ($select.hasClass("select2-hidden-accessible")) $select.val('').trigger('change');
            alerta('error', 'Nenhum item encontrado', 'Não existe nenhum item com esse tipo.');
            return;
        }

        lista.forEach(item => {
            $select.append(new Option(item.ItemName, item.ItemCode));
        });

        if ($select.hasClass("select2-hidden-accessible")) {
            $select.trigger('change');
        } else {
            $select.select2({
                placeholder: 'Digite para filtrar...',
                allowClear: true,
                width: 'resolve'
            });
        }

        if (inputAtivo) {
            $select.off('select2:select').on('select2:select', function (e) {
                const selecionado = e.params.data;
                inputAtivo.value = selecionado.id || '';
                fecharModal_Items();
            });

            $select.off('select2:clear').on('select2:clear', function () {
                inputAtivo.value = '';
            });
        }

        if (lista.length === 1) {
            $select.val(lista[0].ItemCode).trigger('change');
        }

    } catch (err) {
        console.error(err);
        mensagem_erro(err, 'Erro ao carregar itens');
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
        const modal = document.getElementById("itens-session");
        modal.style.display = "none";

    } catch (err) {
        mensagem_erro(err, "Erro ao buscar Cotação")
    }
}

// Buscar Linhas Cotações

async function buscar_linhas_cotacao(DocNum) {
    DocNum = String(DocNum ?? '').trim();

    const linhas = document.querySelectorAll("#grid-concorrentes tr");

    linhas.forEach(linha => {
        linha.querySelector(".rowno").textContent = "";

        linha.querySelector(".Concorrente_grid").innerHTML = '<option value=""></option>';

        linha.querySelector(".ThreatLevel_grid").innerHTML = `
            <option value=""></option>
            <option value="Low">Baixo</option>
            <option value="Medium">Médio</option>
            <option value="High">Alto</option>
        `;

        linha.querySelector(".Marca_grid").value = "";
        linha.querySelector(".Modelo_grid").value = "";

        linha.querySelector(".Qtde_grid").value = "";
        linha.querySelector(".ValorUnit_grid").value = "";
        linha.querySelector(".ValorTot_grid").textContent = "";
        linha.querySelector(".Pos_grid").value = "";

        linha.querySelector(".items-safe").innerHTML = '<option value=""></option>';

        const itemFora = linha.querySelector(".item-fora input");
        if (itemFora) itemFora.value = "";
    });

    try {
        const res = await fetch(`/api/buscar_cotacao_comp?DocNum=${encodeURIComponent(DocNum)}`);

        if (!res.ok) {
            let errData = {};
            try { errData = await res.json(); } catch { }
            throw new Error(errData.erro || 'Erro desconhecido');
        }

        const dados = await res.json();
        console.log(dados)
        if (!dados || dados.length === 0) return;

        dados.forEach(element => {
            if (Number(element.U_LineNum) === 999) {
                codigosItens.push(element);
            }
        });

        linhas.forEach((linha, i) => {
            const c = dados[i];
            if (!c) return;

            // índice
            linha.querySelector(".rowno").value = c.Code || "";

            const selectConc = linha.querySelector(".Concorrente_grid");
            selectConc.innerHTML = "";

            concorrentesCadastrados.forEach(cOpt => {
                const opt = document.createElement("option");
                opt.value = cOpt.SequenceNo;
                opt.text = cOpt.Name;
                selectConc.appendChild(opt);
            });

            const optionSelecionada = Array.from(selectConc.options)
                .find(opt => Number(opt.value) === Number(c.U_ComptID));

            selectConc.value = optionSelecionada ? optionSelecionada.value : "";

            linha.querySelector(".ThreatLevel_grid").value = c.U_ThreatLevel || '';

            linha.querySelector(".Marca_grid").value = c.U_Marca || '';
            linha.querySelector(".Modelo_grid").value = c.U_Modelo || '';

            linha.querySelector(".Qtde_grid").value = c.U_Quantidade || '';
            linha.querySelector(".ValorUnit_grid").value = formatarMoedaParaExibicao(c.U_ValorUnit) || '';
            linha.querySelector(".ValorTot_grid").textContent = formatarMoedaParaExibicao(c.U_ValorTot) || '';
            linha.querySelector(".Pos_grid").value = c.U_Posicao || '';

            const itemSelect = linha.querySelector(".items-safe");
            itemSelect.innerHTML = "";

            itensCadastrados.forEach(dOpt => {
                const opt = document.createElement("option");
                opt.value = dOpt.LineNum;
                opt.text = dOpt.ItemDescription;
                itemSelect.appendChild(opt);
            });

            // opção fora da cotação
            const optionNew = new Option("Item fora da cotação", "999");
            itemSelect.appendChild(optionNew);

            let optionItem = Array.from(itemSelect.options)
                .find(opt => Number(opt.value) === Number(c.U_LineNum));

            if (Number(c.U_LineNum) === 999) {
                if (!optionItem) {
                    optionItem = new Option("Item Fora da cotação", "999");
                    itemSelect.add(optionItem);
                } else {
                    optionItem.text = "Item Fora da cotação";
                }
            }

            itemSelect.value = optionItem ? optionItem.value : "";

            const inputItemFora = linha.querySelector(".item-fora input");
            if (inputItemFora) {
                inputItemFora.value = c.U_ItemCode || '';
            }
        });

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
        const ItemCode = document.getElementById("Item_Filtrado").value.trim()

        if (ItemCode === "" && lineNum === 999) {
            alerta('warning', 'Item obrigatório', 'Selecione o item da cotação.');
            btn.disabled = false;
            return;
        }
        let concorrente = {};

        concorrente = {
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
            U_ValorTot: valorTot,
            U_ItemCode: Number(lineNum) === 999 ? ItemCode : ""
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

    const tbody = document.querySelector("#grid-concorrentes");
    const linhas = Array.from(tbody.querySelectorAll("tr"));

    payload = [];

    linhas.forEach(linha => {

        payload.push(linha);

        const qtdInput = linha.querySelector(".Qtde_grid");
        const unitInput = linha.querySelector(".ValorUnit_grid");
        const totCell = linha.querySelector(".ValorTot_grid");

        if (unitInput) {
            unitInput.addEventListener("input", (e) => {
                formatarMoeda(e.target);
                calcular_total_linha(linha);
            });
        }

        if (qtdInput) {
            qtdInput.addEventListener("input", () => {
                calcular_total_linha(linha);
            });
        }

        if (totCell) {
            totCell.contentEditable = false;
        }
    });

    tbody.addEventListener("click", (event) => {

        const linhaClicada = event.target.closest("tr");
        if (!linhaClicada) return;

        linhas.forEach(l => {
            l.classList.remove("linha-selecionada");

            l.querySelectorAll("input, select").forEach(el => {
                el.classList.remove("linha-selecionada-campo");
            });
        });

        linhaClicada.classList.add("linha-selecionada");

        linhaClicada.querySelectorAll("input, select").forEach(el => {
            el.classList.add("linha-selecionada-campo");
        });

        const codigo = linhaClicada.querySelector(".rowno");
        CodeSelecionado = codigo ? codigo.value : null;

        if (!linhaClicada) {
            return alerta('error', 'Erro', 'Linha do concorrente não encontrada.');
        }

        linhaSelecionada = linhaClicada;

    });
}

async function atualizar_concorrente() {
    const DocNum = document.getElementById("DocNum").value;

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

    const lineValue = linhaSelecionada.querySelector(".items-safe")?.value;
    const ItemCode = linhaSelecionada.querySelector(".item-fora .nome-item")?.value;

    const line = Number(lineValue);

    if (!lineValue) {
        await alerta('warning', 'Item obrigatório', 'Selecione o item da cotação.');
        return;
    }

    if (line === 999 && !ItemCode) {
        await alerta('warning', 'Item obrigatório', 'Informe o código do Item.');
        return;
    }

    if (line !== 999 && ItemCode) {
        await alerta(
            'warning',
            'Seleção inválida',
            'Você não pode escolher um item da cotação e um item fora da cotação ao mesmo tempo.'
        );
        return;
    }

    let concorrenteAtualizado;

    try {
        concorrenteAtualizado = {
            U_ComptID: linhaSelecionada.querySelector(".Concorrente_grid")?.value,
            U_ThreatLevel: linhaSelecionada.querySelector(".ThreatLevel_grid")?.value,
            U_Marca: linhaSelecionada.querySelector(".Marca_grid")?.value,
            U_Modelo: linhaSelecionada.querySelector(".Modelo_grid")?.value,

            U_Quantidade: validarNumero(
                linhaSelecionada.querySelector(".Qtde_grid"),
                "Quantidade"
            ),

            U_ValorUnit: validarNumero(
                linhaSelecionada.querySelector(".ValorUnit_grid"),
                "Valor Unitário"
            ),

            U_ValorTot: validarNumero(
                linhaSelecionada.querySelector(".ValorTot_grid"),
                "Valor Total"
            ),

            U_Posicao: validarNumero(
                linhaSelecionada.querySelector(".Pos_grid"),
                "Posição"
            ),

            U_LineNum: Number(lineValue),

            U_ItemCode: line === 999 ? ItemCode : ""
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
        });

        if (!resp) return;

        let data = null;
        try { data = await resp.json(); } catch { }

        if (!resp.ok) {
            throw new Error(data?.erro || data?.message || "Erro ao atualizar");
        }

        await alerta('success', 'Sucesso', data?.mensagem || "Concorrente atualizado com sucesso!");

        CodeSelecionado = null;
        linhaSelecionada = null;

        document.querySelectorAll("#grid-concorrentes tr").forEach(tr => {
            tr.classList.remove("linha-selecionada");
        });

        buscar_linhas_cotacao(DocNum);

    } catch (err) {
        mensagem_erro(err, 'Erro ao atualizar concorrente');
        console.error(err);
    }
}

function validarNumero(input, nomeCampo) {
    const valorBruto = input?.value ?? input?.textContent ?? "";

    const valor = parseValorBR(valorBruto);

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
    const campos = ["concorrente", "U_ThreatLevel", "U_Marca", "U_Modelo", "U_Observacao", "U_Quantidade", "U_ValorUnit", "U_ValorTot", "U_Posicao", "U_LineNum", "ItemCotacao", "U_FOC_GRP"]
    campos.forEach(id => {
        const elemento = document.getElementById(id);
        if (!elemento) return;
        if ($(elemento).hasClass("select2-hidden-accessible")) {
            $(elemento)
                .val(null)
                .empty()
                .append('<option value="">Selecione</option>')
                .trigger('change');
        } else {
            elemento.value = "";
        }
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

    const qtdInput = linha.querySelector(".Qtde_grid");
    const unitInput = linha.querySelector(".ValorUnit_grid");
    const totCell = linha.querySelector(".ValorTot_grid");

    if (!qtdInput || !unitInput || !totCell) return;

    const qtd = Number(qtdInput.value) || 0;
    const unit = parseValorBR(unitInput.value) || 0;

    const total = qtd * unit;

    totCell.textContent = formatarMoedaParaExibicao(total);
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


// ===== Modal Itens =====

function abrirModalItemSafe(botao) {

    const linha = botao.closest("tr");

    const itemSelect = linha.querySelector(".items-safe");

    if (Number(itemSelect?.value) !== 999) {
        return alerta(
            'warning',
            'Item Safe incorreto',
            'Você precisa informar que é um item fora da cotação primeiro.'
        );
    }
    const input = linha.querySelector(".item-fora .nome-item");
    inputAtivo = input;

    document.getElementById("modalItemSafe").style.display = "flex";

    document.getElementById("ItemsSafeModal").innerHTML = '<option value="">Carregando...</option>';
    document.getElementById("ItemSafeModal").innerHTML = '<option value="">Selecione</option>';
    carregar_filtro_itens("ItemsSafeModal", (code) => {
        carregarItensFiltradosGenerico("ItemSafeModal", code, inputAtivo);
    });
}

function fecharModalItemSafe() {
    document.getElementById("modalItemSafe").style.display = "none";
    inputAtivo = null;
}