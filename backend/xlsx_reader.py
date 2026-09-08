"""Interpreta planilhas do Livro Razão em formato .xlsx usando openpyxl.

Mantém total paridade com backend.ledger na identificação de colunas,
cabeçalhos, lançamentos e regras de conciliação.
"""

from __future__ import annotations

import datetime
import io
import os
from pathlib import Path
import unicodedata

import openpyxl
from openpyxl.utils.datetime import from_excel

from .ledger import Lancamento, Razao
from .xls_reader import ArquivoInvalido


def _texto(valor) -> str:
    if valor is None:
        return ""
    if isinstance(valor, float):
        return str(int(valor)) if valor.is_integer() else str(valor)
    return str(valor).strip()


def _chave(valor) -> str:
    """Normaliza um rótulo para comparação: sem acento, minúsculo, sem pontos ou dois pontos."""
    texto = unicodedata.normalize("NFKD", _texto(valor))
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return texto.lower().replace(".", "").replace(":", "").strip()


def _centavos(valor) -> int | None:
    if valor is None or valor == "":
        return None
    if isinstance(valor, (int, float)):
        return int(round(float(valor) * 100))
    if isinstance(valor, str):
        v = valor.strip().replace("R$", "").strip()
        if not v:
            return None
        # Tratamento de formato monetário BR (ex: "1.234,56" -> "1234.56")
        if "." in v and "," in v:
            v = v.replace(".", "").replace(",", ".")
        elif "," in v:
            v = v.replace(",", ".")
        try:
            return int(round(float(v) * 100))
        except ValueError:
            return None
    return None


def _converter_data(valor) -> str | None:
    if valor is None or valor == "":
        return None
    if isinstance(valor, datetime.datetime):
        return valor.date().isoformat()
    if isinstance(valor, datetime.date):
        return valor.isoformat()
    if isinstance(valor, (int, float)):
        if valor > 0:
            try:
                dt = from_excel(valor)
                if isinstance(dt, datetime.datetime):
                    return dt.date().isoformat()
                if isinstance(dt, datetime.date):
                    return dt.isoformat()
            except Exception:
                pass
    if isinstance(valor, str):
        v = valor.strip()
        # Formato DD/MM/AAAA
        if len(v) == 10 and v[2] == "/" and v[5] == "/":
            dia, mes, ano = v[:2], v[3:5], v[6:]
            if dia.isdigit() and mes.isdigit() and ano.isdigit():
                return f"{ano}-{mes}-{dia}"
        # Formato AAAA-MM-DD
        if len(v) == 10 and v[4] == "-" and v[7] == "-":
            return v
    return None


TITULOS = {
    "data": "data",
    "historico": "historico",
    "ctacpart": "contrapartida",
    "cta c part": "contrapartida",
    "contrapartida": "contrapartida",
    "c/partida": "contrapartida",
    "debito": "debito",
    "credito": "credito",
    "saldo": "saldo",
}


def _localizar_colunas(grid: list[list]) -> tuple[int, dict[str, int]]:
    """Localiza a linha de títulos e o índice de cada coluna conhecida."""
    for linha_idx, row in enumerate(grid[:40]):
        rotulos: dict[str, int] = {}
        for col_idx, val in enumerate(row):
            campo = TITULOS.get(_chave(val))
            if campo and campo not in rotulos:
                rotulos[campo] = col_idx
        if "debito" in rotulos and "credito" in rotulos:
            return linha_idx, rotulos
    raise ArquivoInvalido("não encontrei as colunas Débito e Crédito nesta planilha")


def ler(arquivo_ou_bytes: str | Path | bytes | io.BytesIO, nome_arquivo: str = "") -> Razao:
    """Lê uma planilha .xlsx a partir de caminho em disco ou bytes em memória."""
    if not nome_arquivo:
        if isinstance(arquivo_ou_bytes, (str, Path)):
            nome_arquivo = os.path.basename(str(arquivo_ou_bytes))
        else:
            nome_arquivo = "planilha.xlsx"

    origem = arquivo_ou_bytes
    if isinstance(arquivo_ou_bytes, bytes):
        origem = io.BytesIO(arquivo_ou_bytes)

    try:
        wb = openpyxl.load_workbook(origem, data_only=True)
    except Exception as erro:
        raise ArquivoInvalido(f"não foi possível ler {nome_arquivo}: {erro}") from erro

    if not wb.worksheets:
        raise ArquivoInvalido(f"a pasta de trabalho {nome_arquivo} não contém planilhas")

    ws = wb.worksheets[0]
    grid: list[list] = [list(row) for row in ws.iter_rows(values_only=True)]
    if not grid or not any(any(row) for row in grid):
        raise ArquivoInvalido(f"a planilha {nome_arquivo} está vazia")

    linha_titulos, colunas = _localizar_colunas(grid)
    razao = Razao(arquivo=nome_arquivo)

    # ---- Cabeçalho contábil (empresa, cnpj, período)
    for linha in range(linha_titulos):
        row = grid[linha]
        ncols = len(row)
        for coluna in range(ncols):
            celula_val = row[coluna]
            rotulo = _chave(celula_val)

            # Rótulo e valor na mesma célula: ex: "Empresa: XYZ"
            texto_bruto = _texto(celula_val)
            if ":" in texto_bruto:
                partes = texto_bruto.split(":", 1)
                chave_esq = _chave(partes[0])
                val_dir = partes[1].strip()
                if chave_esq in ("empresa", "cnpj", "periodo") and val_dir:
                    campo_destino = "cnpj" if chave_esq == "cnpj" else chave_esq
                    if not getattr(razao, campo_destino):
                        setattr(razao, campo_destino, val_dir)

            # Rótulo em uma coluna e valor nas colunas seguintes
            if rotulo in ("empresa", "cnpj", "periodo"):
                valor = next(
                    (
                        _texto(row[c])
                        for c in range(coluna + 1, ncols)
                        if _texto(row[c])
                    ),
                    "",
                )
                campo_destino = "cnpj" if rotulo == "cnpj" else rotulo
                if valor and not getattr(razao, campo_destino):
                    setattr(razao, campo_destino, valor)

    proximo_id = 0
    com_debito_e_credito = 0

    for linha in range(linha_titulos + 1, len(grid)):
        row = grid[linha]
        ncols = len(row)
        valores = [_texto(val) for val in row]
        if not any(valores):
            continue

        def celula(campo: str):
            coluna = colunas.get(campo)
            if coluna is None or coluna >= ncols:
                return None
            return row[coluna]

        primeiro_nao_vazio = next((_chave(v) for v in valores if v), "")
        historico = _texto(celula("historico"))

        # ---- Bloco "Conta: 504 2.1.30.100.1 DUPLICATAS A PAGAR"
        if primeiro_nao_vazio.startswith("conta"):
            texto_completo = " ".join(v for v in valores if v)
            tokens = [t for v in valores for t in v.split()]
            codigo = next((t for t in tokens if t.count(".") >= 2), "")
            if codigo and codigo in texto_completo:
                nome = texto_completo.split(codigo, 1)[1].strip()
            else:
                nome = next(
                    (
                        t
                        for t in tokens
                        if not t.replace(".", "").isdigit() and _chave(t) != "conta"
                    ),
                    "",
                )
            if not razao.conta:
                razao.conta, razao.conta_nome = codigo, nome
            razao.linhas.append(
                {"tipo": "conta", "codigo": codigo, "nome": nome}
            )
            continue

        # ---- "SALDO ANTERIOR"
        if _chave(historico) == "saldo anterior":
            saldo = _centavos(celula("saldo"))
            if saldo is None:
                saldo = next(
                    (
                        _centavos(row[c])
                        for c in reversed(range(ncols))
                        if _centavos(row[c]) is not None
                    ),
                    None,
                )
            razao.saldo_anterior = saldo
            razao.linhas.append({"tipo": "saldo_anterior", "saldo": saldo})
            continue

        debito = _centavos(celula("debito"))
        credito = _centavos(celula("credito"))

        # ---- "Total do mês"
        if any(_chave(v).startswith("total") for v in valores):
            razao.total_debito, razao.total_credito = debito, credito
            razao.linhas.append(
                {"tipo": "total", "debito": debito, "credito": credito}
            )
            continue

        if debito is None and credito is None:
            continue

        data = _converter_data(celula("data"))
        contrapartida = _texto(celula("contrapartida"))
        saldo_linha = _centavos(celula("saldo"))

        registro = {
            "tipo": "lancamento",
            "data": data,
            "historico": historico,
            "contrapartida": contrapartida,
            "saldo": saldo_linha,
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

    lancamentos_por_linha = [l for l in razao.linhas if l["tipo"] == "lancamento"]
    razao.colunas_ordenadas = bool(lancamentos_por_linha) and (
        com_debito_e_credito > 0.5 * len(lancamentos_por_linha)
    )

    return razao


# Alias para conformidade com a assinatura do plano
ler_xlsx = ler
