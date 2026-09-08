/* Conferidor de Razão — carrega a planilha, desenha o razão e marca
   no papel o que a conciliação encontrou. */

(() => {
  "use strict";

  const estado = {
    dados: null,
    lancamentos: new Map(),
    filtro: "todos",
    busca: "",
    selecionado: null,
  };

  const $ = (id) => document.getElementById(id);
  const corpo = $("corpo");

  /* ---------- formatação ---------- */

  const moeda = (centavos) =>
    centavos == null
      ? ""
      : (centavos / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  const data = (iso) => (iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "");

  const inteiro = (n) => (n ?? 0).toLocaleString("pt-BR");

  const esc = (texto) =>
    String(texto ?? "").replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );

  const normalizar = (texto) =>
    String(texto ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

  /* ---------- carregamento ---------- */

  async function carregarArquivos() {
    const resposta = await fetch("/api/arquivos");
    const { arquivos } = await resposta.json();

    const rotulo = (a) => {
      if (a.erro) return `${a.nome} — não foi possível ler`;
      const marca = a.colunas_ordenadas ? " · colunas ordenadas" : "";
      return `${a.nome} · ${inteiro(a.lancamentos)} lançamentos${marca}`;
    };

    $("arquivo").innerHTML = arquivos
      .map((a) => `<option value="${esc(a.nome)}">${esc(rotulo(a))}</option>`)
      .join("");
    return arquivos;
  }

  /* O razão completo é o mais útil: traz data, saldo e histórico ligados ao
     valor. Só cai no de colunas ordenadas se não houver outro. */
  const escolherPadrao = (arquivos) =>
    arquivos.find((a) => !a.erro && !a.colunas_ordenadas) ||
    arquivos.find((a) => !a.erro) ||
    arquivos[0];

  async function carregarRazao(nome) {
    const folha = $("folha");
    folha.setAttribute("aria-busy", "true");
    const resposta = await fetch("/api/razao?arquivo=" + encodeURIComponent(nome || ""));
    const dados = await resposta.json();
    if (dados.erro) {
      estado.dados = null;
      corpo.innerHTML = "";
      $("aviso").hidden = false;
      $("aviso").textContent = dados.erro;
      folha.setAttribute("aria-busy", "false");
      return;
    }

    estado.dados = dados;
    estado.selecionado = null;
    estado.lancamentos = new Map(dados.lancamentos.map((l) => [l.id, l]));
    prepararBusca(dados);
    desenharCabecalho(dados);
    desenharResumo(dados);
    desenharTabela();
    fecharAmarracao();
    folha.setAttribute("aria-busy", "false");
  }

  function prepararBusca(dados) {
    for (const linha of dados.linhas) {
      if (linha.tipo !== "lancamento") continue;
      const valores = [linha.debito, linha.credito]
        .filter((id) => id != null)
        .map((id) => {
          const l = estado.lancamentos.get(id);
          return moeda(l.valor) + " " + l.valor / 100;
        });
      linha.busca = normalizar(
        [data(linha.data), linha.historico, linha.contrapartida, ...valores].join(" ")
      );
    }
  }

  /* ---------- cabeçalho e resumo ---------- */

  function desenharCabecalho(dados) {
    $("empresa").textContent = dados.empresa || "Razão";
    $("cnpj").textContent = dados.cnpj || "";
    $("periodo").textContent = dados.periodo || "";
    $("conta").textContent = dados.conta
      ? `Conta ${dados.conta} · ${dados.conta_nome}`
      : "";
    document.title = `Razão · ${dados.conta_nome || dados.arquivo}`;

    const aviso = $("aviso");
    aviso.hidden = !dados.colunas_ordenadas;
    if (dados.colunas_ordenadas) {
      aviso.innerHTML =
        "<b>Neste arquivo as colunas Débito e Crédito foram ordenadas separadamente.</b> " +
        "O valor não pertence à linha em que aparece, então data, histórico e conta-partida " +
        "ficam esmaecidos — eles seguem a ordem original do razão. A conferência por valor " +
        "continua valendo; o prazo de pagamento, não.";
    }
  }

  function desenharResumo(dados) {
    const r = dados.resumo;
    const cobertura = r.cobertura_valor.toFixed(1).replace(".", ",") + "%";

    $("cobertura").textContent = cobertura;
    // timer, e não requestAnimationFrame: a aba pode carregar em segundo
    // plano, e aí o traço do medidor nunca sairia do zero.
    $("medidor-grifo").style.width = "0";
    setTimeout(() => {
      $("medidor-grifo").style.width = Math.max(r.cobertura_valor, 0.5) + "%";
    }, 60);

    const preencher = (chave, total, legenda) => {
      $("n-" + chave).textContent = "R$ " + moeda(total.valor);
      $("q-" + chave).textContent = legenda;
    };

    preencher("credito", r.creditos, `${inteiro(r.creditos.qtd)} lançamentos`);
    preencher(
      "quitado",
      r.quitados,
      `${inteiro(r.quitados.qtd)} de ${inteiro(r.creditos.qtd)} · ` +
        (r.prazo_medio == null
          ? "sem data confiável"
          : `${r.prazo_medio.toFixed(1).replace(".", ",")} dias em média`)
    );
    preencher("aberto", r.abertos, `${inteiro(r.abertos.qtd)} sem pagamento de mesmo valor`);
    preencher("sempar", r.sem_par, `${inteiro(r.sem_par.qtd)} débitos, provável mês anterior`);

    $("nota").textContent =
      dados.colunas_ordenadas || !r.quitados.qtd
        ? ""
        : `A amarração é pelo valor. Em ${inteiro(r.corroborados)} dos ` +
          `${inteiro(r.quitados.qtd)} pares o mesmo fornecedor aparece nos dois ` +
          "históricos, o que sustenta a correspondência.";
  }

  /* ---------- tabela ---------- */

  function visivel(linha) {
    if (linha.tipo !== "lancamento") {
      return estado.filtro === "todos" && !estado.busca;
    }
    if (estado.busca && !linha.busca.includes(estado.busca)) return false;
    if (estado.filtro === "todos") return true;

    const situacao = (id) => (id == null ? null : estado.lancamentos.get(id).status);
    const debito = situacao(linha.debito);
    const credito = situacao(linha.credito);

    if (estado.filtro === "quitado") return debito === "conciliado" || credito === "conciliado";
    if (estado.filtro === "aberto") return credito === "aberto";
    if (estado.filtro === "sem_par") return debito === "sem_par";
    return true;
  }

  function celulaValor(id) {
    if (id == null) return '<td class="c-num"></td>';
    const l = estado.lancamentos.get(id);
    const valor = moeda(l.valor);

    if (l.status === "conciliado") {
      const par = estado.lancamentos.get(l.par);
      const titulo =
        l.tipo === "C"
          ? `Pago em ${data(par.data) || "—"} — ${esc(par.historico)}`
          : `Quita a aquisição de ${data(par.data) || "—"} — ${esc(par.historico)}`;
      return (
        `<td class="c-num"><button type="button" class="marca marca--grifo" ` +
        `data-id="${l.id}" title="${titulo}">${valor}</button></td>`
      );
    }

    const marca = l.tipo === "C" ? "marca--lapis" : "marca--azul";
    const titulo =
      l.tipo === "C"
        ? "Sem débito de mesmo valor no mês"
        : "Sem crédito de mesmo valor no mês";
    return `<td class="c-num"><span class="marca ${marca}" title="${titulo}">${valor}</span></td>`;
  }

  function desenharTabela() {
    const dados = estado.dados;
    if (!dados) return;
    const partes = [];
    let mostradas = 0;

    for (const linha of dados.linhas) {
      if (!visivel(linha)) continue;
      mostradas++;

      if (linha.tipo === "conta") {
        partes.push(
          `<tr class="linha-conta"><td colspan="6">Conta ${esc(linha.codigo)} · ${esc(linha.nome)}</td></tr>`
        );
      } else if (linha.tipo === "saldo_anterior") {
        partes.push(
          `<tr class="linha-saldo"><td colspan="5">Saldo anterior</td>` +
            `<td class="c-num c-saldo">${moeda(linha.saldo)}</td></tr>`
        );
      } else if (linha.tipo === "total") {
        partes.push(
          `<tr class="linha-total"><td colspan="3">Total do mês</td>` +
            `<td class="c-num">${moeda(linha.debito)}</td>` +
            `<td class="c-num">${moeda(linha.credito)}</td>` +
            `<td class="c-num c-saldo"></td></tr>`
        );
      } else {
        const saldo = linha.saldo;
        partes.push(
          "<tr>" +
            `<td class="c-data">${data(linha.data)}</td>` +
            `<td class="c-hist"><div class="hist" title="${esc(linha.historico)}">${esc(linha.historico)}</div></td>` +
            `<td class="c-part">${esc(linha.contrapartida)}</td>` +
            celulaValor(linha.debito) +
            celulaValor(linha.credito) +
            `<td class="c-num c-saldo saldo${saldo < 0 ? " saldo--negativo" : ""}">${moeda(saldo)}</td>` +
            "</tr>"
        );
      }
    }

    corpo.innerHTML = partes.join("");
    $("vazio").hidden = mostradas > 0;

    const tabela = document.querySelector(".razao");
    tabela.classList.toggle("solto", !!dados.colunas_ordenadas);
    tabela.classList.toggle("sem-saldo", !dados.linhas.some((l) => l.saldo != null));

    if (estado.selecionado != null) {
      const rolar = estado.rolarDepois === true;
      estado.rolarDepois = false;
      marcarPar(estado.selecionado, rolar);
    }
  }

  /* ---------- amarração do par ---------- */

  const elementoDe = (id) => corpo.querySelector(`.marca[data-id="${id}"]`);

  function limparMarcas() {
    corpo.querySelectorAll(".marca--ativa").forEach((e) => e.classList.remove("marca--ativa"));
    corpo.querySelectorAll(".par-ativo").forEach((e) => e.classList.remove("par-ativo"));
  }

  function marcarPar(id, rolar = true) {
    const lancamento = estado.lancamentos.get(id);
    if (!lancamento || lancamento.par == null) return;

    // se o par estiver fora do filtro atual, abre a visão completa
    if (!elementoDe(lancamento.par) || !elementoDe(id)) {
      estado.filtro = "todos";
      estado.busca = "";
      $("busca").value = "";
      document.querySelectorAll(".filtro").forEach((b) =>
        b.classList.toggle("filtro--ativo", b.dataset.filtro === "todos")
      );
      estado.selecionado = id;
      estado.rolarDepois = true;
      desenharTabela();
      return;
    }

    limparMarcas();
    estado.selecionado = id;

    const par = estado.lancamentos.get(lancamento.par);
    for (const atual of [lancamento, par]) {
      const elemento = elementoDe(atual.id);
      if (!elemento) continue;
      elemento.classList.add("marca--ativa");
      elemento.closest("tr").classList.add("par-ativo");
    }

    const credito = lancamento.tipo === "C" ? lancamento : par;
    const debito = lancamento.tipo === "D" ? lancamento : par;

    $("am-selo").textContent = "Amarração " + credito.amarracao;
    $("am-credito-hist").textContent = credito.historico || "—";
    $("am-credito-data").textContent = data(credito.data) || "sem data";
    $("am-credito-valor").textContent = "R$ " + moeda(credito.valor);
    $("am-debito-hist").textContent = debito.historico || "—";
    $("am-debito-data").textContent = data(debito.data) || "sem data";
    $("am-debito-valor").textContent = "R$ " + moeda(debito.valor);
    $("am-elo").textContent =
      credito.dias == null
        ? "mesmo valor"
        : credito.dias === 0
        ? "pago no mesmo dia"
        : `pago em ${credito.dias} dia${credito.dias > 1 ? "s" : ""}`;

    const conferencia = $("am-conferencia");
    conferencia.textContent =
      credito.corroborado == null
        ? ""
        : credito.corroborado
        ? "fornecedor confere nos dois históricos"
        : "históricos citam nomes diferentes — vale conferir";
    conferencia.classList.toggle(
      "amarracao__conferencia--duvida",
      credito.corroborado === false
    );

    $("amarracao").hidden = false;

    if (rolar) {
      const destino = elementoDe(par.id).closest("tr");
      destino.scrollIntoView({ block: "center", behavior: "smooth" });
      destino.classList.remove("piscar");
      void destino.offsetWidth;
      destino.classList.add("piscar");
    }
  }

  function fecharAmarracao() {
    limparMarcas();
    estado.selecionado = null;
    $("amarracao").hidden = true;
  }

  /* ---------- exportação ---------- */

  function baixarCSV() {
    if (!estado.dados) return;
    const cabecalho = [
      "Data", "Histórico", "Cta.C.Part.", "Débito", "Situação débito",
      "Crédito", "Situação crédito", "Amarração",
    ];
    const rotulo = { conciliado: "quitado", aberto: "em aberto", sem_par: "sem par" };
    const campo = (t) => `"${String(t ?? "").replace(/"/g, '""')}"`;

    const linhas = estado.dados.linhas
      .filter((l) => l.tipo === "lancamento" && visivel(l))
      .map((l) => {
        const d = l.debito != null ? estado.lancamentos.get(l.debito) : null;
        const c = l.credito != null ? estado.lancamentos.get(l.credito) : null;
        return [
          data(l.data), l.historico, l.contrapartida,
          d ? moeda(d.valor) : "", d ? rotulo[d.status] : "",
          c ? moeda(c.valor) : "", c ? rotulo[c.status] : "",
          (c || d)?.amarracao ?? "",
        ].map(campo).join(";");
      });

    const conteudo = "﻿" + [cabecalho.join(";"), ...linhas].join("\r\n");
    const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "conferencia-" + estado.dados.arquivo.replace(/\.xlsx?$/i, "") + ".csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- eventos ---------- */

  corpo.addEventListener("click", (evento) => {
    const marca = evento.target.closest(".marca--grifo");
    if (!marca) return;
    const id = Number(marca.dataset.id);
    if (estado.selecionado === id) fecharAmarracao();
    else marcarPar(id);
  });

  $("filtros").addEventListener("click", (evento) => {
    const botao = evento.target.closest(".filtro");
    if (!botao) return;
    estado.filtro = botao.dataset.filtro;
    document.querySelectorAll(".filtro").forEach((b) =>
      b.classList.toggle("filtro--ativo", b === botao)
    );
    desenharTabela();
  });

  let temporizador;
  $("busca").addEventListener("input", (evento) => {
    clearTimeout(temporizador);
    const termo = normalizar(evento.target.value.trim());
    temporizador = setTimeout(() => {
      estado.busca = termo;
      desenharTabela();
    }, 140);
  });

  $("arquivo").addEventListener("change", (e) => carregarRazao(e.target.value));
  $("am-fechar").addEventListener("click", fecharAmarracao);
  $("baixar").addEventListener("click", baixarCSV);

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") fecharAmarracao();
  });

  /* ---------- início ---------- */

  (async () => {
    const arquivos = await carregarArquivos();
    if (!arquivos.length) {
      $("aviso").hidden = false;
      $("aviso").textContent = "Nenhuma planilha .xls encontrada na pasta.";
      $("folha").setAttribute("aria-busy", "false");
      return;
    }
    const padrao = escolherPadrao(arquivos);
    $("arquivo").value = padrao.nome;
    await carregarRazao(padrao.nome);
  })();
})();
