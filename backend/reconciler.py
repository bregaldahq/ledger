"""Concilia crédito com débito pelo valor exato.

Em "Duplicatas a Pagar" o crédito registra o que foi adquirido e o débito
registra o pagamento. Cada crédito procura um débito de valor idêntico, e
cada débito só pode quitar um crédito — a correspondência é 1 para 1.

Havendo mais de um débito com o mesmo valor:
- Vale o pagamento logo após a aquisição com menor distância de dias
  (ex: compra em 01/07 vincula com pagamento em 05/07, não em 25/07).
- Se houver pagamento com o mesmo fornecedor identificado no histórico, prioriza-o.
- Não havendo nenhum pagamento posterior, vale o mais recente anterior.
- Em caso de empate de datas, vale a ordem de lançamento na planilha.
"""

from __future__ import annotations

import re
from datetime import date

from .ledger import Lancamento, Razao

QUITADO = "conciliado"
ABERTO = "aberto"
SEM_PAR = "sem_par"

# Palavras que aparecem em quase todo histórico e não identificam ninguém.
GENERICAS = {
    "LTDA", "EIRELI", "INDUSTRIA", "COMERCIO", "SERVICOS", "SERVICO", "PECAS",
    "TRANSPORTES", "DISTRIBUIDORA", "EMPRESAS", "REUNIDAS", "BOLETO", "VALOR",
    "LIQUIDACAO", "PAGAMENTO", "PAGTO", "TRANSFERENCIA", "ENVIADA", "TRANF", "DPTA",
    "PRODUTOS", "MATERIAIS", "BRASIL", "NACIONAL", "SICREDI", "CONTAS",
    "ENTRE", "TRANSF", "DEBITO", "CREDITO", "PIX_DEB", "S/A", "ME", "EPP",
    "NFSE", "NOTA", "FISCAL", "DUPLICATA", "TITULO", "VALOREMF", "INVEST", "AUTO",
    "BANCO", "CAIXA", "REF", "PARC", "CONTRATO", "FATURA", "VENC", "VENCIMENTO",
    "NRO", "NUMERO", "DEPOSITO", "CHEQUE", "COMPRA", "TAXA", "TARIFA", "MULTISETO",
}


def _nomes(historico: str) -> set[str]:
    """Palavras do histórico que podem identificar o fornecedor."""
    limpo = re.sub(r"[.\-/]", " ", (historico or "").upper())
    limpo = re.sub(r"\b\d+\b", " ", limpo)
    return {p for p in re.findall(r"[A-ZÇÃÕÁÉÍÓÚÂÊÔ]{4,}", limpo) if p not in GENERICAS}


def _ordem(lancamento: Lancamento) -> tuple[str, int]:
    return (lancamento.data or "", lancamento.linha)


def _dias(inicio: str | None, fim: str | None) -> int | None:
    if not inicio or not fim:
        return None
    try:
        return (date.fromisoformat(fim) - date.fromisoformat(inicio)).days
    except Exception:
        return None


def conciliar(razao: Razao) -> dict:
    usar_datas = not razao.colunas_ordenadas
    ordem = _ordem if usar_datas else (lambda l: ("", l.linha))

    debitos = sorted((l for l in razao.lancamentos if l.tipo == "D"), key=ordem)
    creditos = sorted((l for l in razao.lancamentos if l.tipo == "C"), key=ordem)

    for lancamento in razao.lancamentos:
        lancamento.status = ABERTO if lancamento.tipo == "C" else SEM_PAR
        lancamento.par = None
        lancamento.amarracao = None
        lancamento.dias = None
        lancamento.corroborado = None
        lancamento.candidatos = []

    disponiveis: dict[int, list[Lancamento]] = {}
    for debito in debitos:
        disponiveis.setdefault(debito.valor, []).append(debito)

    amarracao = 0

    for credito in creditos:
        fila = disponiveis.get(credito.valor)
        if not fila:
            continue

        if usar_datas and credito.data:
            posteriores = [d for d in fila if (d.data or "") >= credito.data]
            nomes_c = _nomes(credito.historico)

            if posteriores:
                # Se houver pagamentos com o mesmo fornecedor identificado, prioriza-os
                corroborados = [d for d in posteriores if nomes_c and (nomes_c & _nomes(d.historico))]
                candidatos = corroborados if corroborados else posteriores

                # Menor distância em dias a partir da data da compra
                escolhido = min(
                    candidatos,
                    key=lambda d: (_dias(credito.data, d.data) or 0, d.linha),
                )
            else:
                # Todos os pagamentos disponíveis são anteriores à data da compra:
                # Escolhe o mais recente anterior (menor distância absoluta de dias)
                corroborados = [d for d in fila if nomes_c and (nomes_c & _nomes(d.historico))]
                candidatos = corroborados if corroborados else fila
                escolhido = min(
                    candidatos,
                    key=lambda d: (abs(_dias(credito.data, d.data) or 99999), d.linha),
                )
        else:
            escolhido = fila[0]

        fila.remove(escolhido)
        if not fila:
            del disponiveis[credito.valor]

        amarracao += 1
        dias = _dias(credito.data, escolhido.data) if usar_datas else None
        corroborado = (
            bool(_nomes(credito.historico) & _nomes(escolhido.historico))
            if usar_datas
            else None
        )

        for lancamento, par in ((credito, escolhido), (escolhido, credito)):
            lancamento.status = QUITADO
            lancamento.par = par.id
            lancamento.amarracao = amarracao
            lancamento.dias = dias
            lancamento.corroborado = corroborado

    return _resumo(razao, creditos, debitos)


def _totais(lancamentos) -> dict:
    lancamentos = list(lancamentos)
    return {
        "qtd": len(lancamentos),
        "valor": sum(l.valor for l in lancamentos),
    }


def _resumo(razao: Razao, creditos: list, debitos: list) -> dict:
    quitados = [c for c in creditos if c.status == QUITADO]
    abertos = [c for c in creditos if c.status == ABERTO]
    sem_par = [d for d in debitos if d.status == SEM_PAR]

    total_credito = sum(c.valor for c in creditos)
    prazos = [c.dias for c in quitados if c.dias is not None and c.dias >= 0]

    return {
        "debitos": _totais(debitos),
        "creditos": _totais(creditos),
        "quitados": _totais(quitados),
        "abertos": _totais(abertos),
        "sem_par": _totais(sem_par),
        "cobertura_qtd": (len(quitados) / len(creditos) * 100) if creditos else 0.0,
        "cobertura_valor": (
            sum(c.valor for c in quitados) / total_credito * 100
        )
        if total_credito
        else 0.0,
        "prazo_medio": (sum(prazos) / len(prazos)) if prazos else None,
        "corroborados": sum(1 for c in quitados if c.corroborado),
        "confere_total": (
            razao.total_debito in (None, sum(d.valor for d in debitos))
            and razao.total_credito in (None, total_credito)
        ),
    }
