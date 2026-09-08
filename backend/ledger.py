"""Interpreta a planilha do Livro Razão e devolve os lançamentos.

O relatório tem sempre a mesma forma: um cabeçalho com empresa, CNPJ e
período, uma linha de títulos (Data / Histórico / Cta.C.Part. / Débito /
Crédito / Saldo), um ou mais blocos "Conta:" e a linha "Total do mês".
As colunas são localizadas pelos títulos, não por posição fixa.
"""

from __future__ import annotations

import os
import unicodedata
from dataclasses import dataclass, field

import xlrd

from . import xls_reader


def _texto(valor) -> str:
    if valor is None:
        return ""
    if isinstance(valor, float):
        return str(int(valor)) if valor.is_integer() else str(valor)
    return str(valor).strip()


def _chave(valor) -> str:
    """Normaliza um rótulo para comparação: sem acento, minúsculo, sem pontos."""
    texto = unicodedata.normalize("NFKD", _texto(valor))
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return texto.lower().replace(".", "").replace(":", "").strip()


def _centavos(valor) -> int | None:
    if isinstance(valor, (int, float)) and valor != "":
        return int(round(float(valor) * 100))
    return None


@dataclass
class Lancamento:
    id: int
    linha: int
    tipo: str  # 'D' (pagamento) ou 'C' (aquisição)
    valor: int  # centavos
    data: str | None  # aaaa-mm-dd
    historico: str
    contrapartida: str
    # preenchidos pela conciliação
    status: str = "aberto"
    par: int | None = None
    amarracao: int | None = None
    dias: int | None = None
    corroborado: bool | None = None
    candidatos: list[int] = field(default_factory=list)

    def como_dicionario(self) -> dict:
        return {
            "id": self.id,
            "linha": self.linha,
            "tipo": self.tipo,
            "valor": self.valor,
            "data": self.data,
            "historico": self.historico,
            "contrapartida": self.contrapartida,
            "status": self.status,
            "par": self.par,
            "amarracao": self.amarracao,
            "dias": self.dias,
            "corroborado": self.corroborado,
            "candidatos": list(self.candidatos),
        }


@dataclass
class Razao:
    arquivo: str
    empresa: str = ""
    cnpj: str = ""
    periodo: str = ""
    conta: str = ""
    conta_nome: str = ""
    saldo_anterior: int | None = None
    total_debito: int | None = None
    total_credito: int | None = None
    colunas_ordenadas: bool = False
    linhas: list[dict] = field(default_factory=list)
    lancamentos: list[Lancamento] = field(default_factory=list)

    def como_dicionario(self) -> dict:
        return {
            "arquivo": self.arquivo,
            "empresa": self.empresa,
            "cnpj": self.cnpj,
            "periodo": self.periodo,
            "conta": self.conta,
            "conta_nome": self.conta_nome,
            "saldo_anterior": self.saldo_anterior,
            "total_debito": self.total_debito,
            "total_credito": self.total_credito,
            "colunas_ordenadas": self.colunas_ordenadas,
            "linhas": self.linhas,
            "lancamentos": [l.como_dicionario() for l in self.lancamentos],
        }


TITULOS = {
    "data": "data",
    "historico": "historico",
    # "Cta.C.Part." perde os pontos em _chave e vira "ctacpart"
    "ctacpart": "contrapartida",
    "cta c part": "contrapartida",
    "contrapartida": "contrapartida",
    "debito": "debito",
    "credito": "credito",
    "saldo": "saldo",
}


def _localizar_colunas(planilha) -> tuple[int, dict[str, int]]:
    """Acha a linha de títulos e o índice de cada coluna conhecida."""
    for linha in range(min(40, planilha.nrows)):
        rotulos = {}
        for coluna in range(planilha.ncols):
            campo = TITULOS.get(_chave(planilha.cell_value(linha, coluna)))
            if campo and campo not in rotulos:
                rotulos[campo] = coluna
        if "debito" in rotulos and "credito" in rotulos:
            return linha, rotulos
    raise xls_reader.ArquivoInvalido(
        "não encontrei as colunas Débito e Crédito nesta planilha"
    )


def ler(caminho_ou_bytes: str | bytes, nome_arquivo: str = "") -> Razao:
    if not nome_arquivo:
        if isinstance(caminho_ou_bytes, str):
            nome_arquivo = os.path.basename(caminho_ou_bytes)
        else:
            nome_arquivo = "planilha.xls"
    livro = xls_reader.abrir(caminho_ou_bytes)
    planilha = livro.sheet_by_index(0)
    modo_data = livro.datemode
    linha_titulos, colunas = _localizar_colunas(planilha)

    razao = Razao(arquivo=nome_arquivo)

    def celula(linha: int, campo: str):
        coluna = colunas.get(campo)
        if coluna is None or coluna >= planilha.ncols:
            return ""
        return planilha.cell_value(linha, coluna)

    # ---- cabeçalho: rótulo em uma coluna, valor na primeira coluna à direita
    for linha in range(linha_titulos):
        for coluna in range(planilha.ncols - 1):
            rotulo = _chave(planilha.cell_value(linha, coluna))
            if rotulo not in ("empresa", "cnpj", "periodo"):
                continue
            valor = next(
                (
                    _texto(planilha.cell_value(linha, c))
                    for c in range(coluna + 1, planilha.ncols)
                    if _texto(planilha.cell_value(linha, c))
                ),
                "",
            )
            setattr(razao, {"cnpj": "cnpj"}.get(rotulo, rotulo), valor)

    proximo_id = 0
    com_debito_e_credito = 0

    for linha in range(linha_titulos + 1, planilha.nrows):
        valores = [_texto(planilha.cell_value(linha, c)) for c in range(planilha.ncols)]
        if not any(valores):
            continue

        primeira = _chave(planilha.cell_value(linha, 0))
        historico = _texto(celula(linha, "historico"))

        # ---- "Conta: 504  2.1.30.100.1  DUPLICATAS A PAGAR"
        if primeira == "conta":
            partes = [v for v in valores[1:] if v]
            codigo = next((p for p in partes if p.count(".") >= 2), "")
            nome = next((p for p in partes if not p.replace(".", "").isdigit()), "")
            if not razao.conta:
                razao.conta, razao.conta_nome = codigo, nome
            razao.linhas.append(
                {"tipo": "conta", "codigo": codigo, "nome": nome}
            )
            continue

        # ---- "SALDO ANTERIOR"
        if _chave(historico) == "saldo anterior":
            saldo = _centavos(celula(linha, "saldo"))
            if saldo is None:
                saldo = next(
                    (
                        _centavos(planilha.cell_value(linha, c))
                        for c in reversed(range(planilha.ncols))
                        if _centavos(planilha.cell_value(linha, c)) is not None
                    ),
                    None,
                )
            razao.saldo_anterior = saldo
            razao.linhas.append({"tipo": "saldo_anterior", "saldo": saldo})
            continue

        debito = _centavos(celula(linha, "debito"))
        credito = _centavos(celula(linha, "credito"))

        # ---- "Total do mês"
        if any(_chave(v).startswith("total") for v in valores):
            razao.total_debito, razao.total_credito = debito, credito
            razao.linhas.append(
                {"tipo": "total", "debito": debito, "credito": credito}
            )
            continue

        if debito is None and credito is None:
            continue

        data_serial = celula(linha, "data")
        data = None
        if isinstance(data_serial, float) and data_serial > 0:
            data = xlrd.xldate.xldate_as_datetime(data_serial, modo_data).date().isoformat()

        contrapartida = _texto(celula(linha, "contrapartida"))
        registro = {
            "tipo": "lancamento",
            "data": data,
            "historico": historico,
            "contrapartida": contrapartida,
            "saldo": _centavos(celula(linha, "saldo")),
            "debito": None,
            "credito": None,
        }

        if debito is not None and credito is not None:
            com_debito_e_credito += 1

        for valor, tipo, campo in ((debito, "D", "debito"), (credito, "C", "credito")):
            if valor is None:
                continue
            razao.lancamentos.append(
                Lancamento(
                    id=proximo_id,
                    linha=len(razao.linhas),
                    tipo=tipo,
                    valor=valor,
                    data=data,
                    historico=historico,
                    contrapartida=contrapartida,
                )
            )
            registro[campo] = proximo_id
            proximo_id += 1

        razao.linhas.append(registro)

    # Se quase toda linha traz débito e crédito ao mesmo tempo, as duas colunas
    # foram ordenadas em separado: o valor não pertence à linha em que aparece.
    lancamentos_por_linha = [l for l in razao.linhas if l["tipo"] == "lancamento"]
    razao.colunas_ordenadas = bool(lancamentos_por_linha) and (
        com_debito_e_credito > 0.5 * len(lancamentos_por_linha)
    )

    return razao
