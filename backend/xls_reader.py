"""Leitura de arquivos .xls (BIFF8), com reparo de arquivos mal gerados.

Alguns sistemas contábeis gravam o registro BOUNDSHEET com o deslocamento
errado para o início da planilha, e o arquivo abre com erro
("Expected BOF record") tanto no xlrd quanto em vários leitores.
O reparo aqui reescreve esse deslocamento em memória — o arquivo original
nunca é alterado.
"""

from __future__ import annotations

import io
import struct

import olefile
import xlrd

BOUNDSHEET = 0x0085
BOF = 0x0809
SUBSTREAM_PLANILHA = 0x0010


class ArquivoInvalido(Exception):
    """O arquivo não pôde ser lido nem reparado."""


def abrir(origem: str | bytes) -> xlrd.book.Book:
    """Abre a pasta de trabalho, tentando reparar o arquivo se preciso."""
    nome = "arquivo em memória" if isinstance(origem, bytes) else str(origem)
    try:
        if isinstance(origem, bytes):
            return xlrd.open_workbook(file_contents=origem)
        return xlrd.open_workbook(origem)
    except Exception as erro:
        bytes_reparados = _reparar(origem)
        if bytes_reparados is None:
            raise ArquivoInvalido(
                f"não foi possível ler {nome}: {erro}"
            ) from erro
        try:
            return xlrd.open_workbook(file_contents=bytes_reparados)
        except Exception as erro_pos_reparo:
            raise ArquivoInvalido(
                f"não foi possível ler {nome} mesmo após o reparo: "
                f"{erro_pos_reparo}"
            ) from erro_pos_reparo


def _percorrer_registros(fluxo: bytes):
    """Gera (posição, código, tamanho) de cada registro BIFF do fluxo."""
    pos = 0
    limite = len(fluxo)
    while pos + 4 <= limite:
        codigo, tamanho = struct.unpack("<HH", fluxo[pos : pos + 4])
        if pos + 4 + tamanho > limite:
            return
        yield pos, codigo, tamanho
        pos += 4 + tamanho


def _reparar(origem: str | bytes) -> bytes | None:
    """Devolve os bytes do arquivo com os BOUNDSHEET corrigidos, ou None."""
    try:
        ole_origem = io.BytesIO(origem) if isinstance(origem, bytes) else origem
        with olefile.OleFileIO(ole_origem) as ole:
            if not ole.exists("Workbook"):
                return None
            fluxo = ole.openstream("Workbook").read()
    except Exception:
        return None

    boundsheets: list[tuple[int, int]] = []  # (posição, tamanho)
    inicios_planilha: list[int] = []
    for pos, codigo, tamanho in _percorrer_registros(fluxo):
        if codigo == BOUNDSHEET:
            boundsheets.append((pos, tamanho))
        elif codigo == BOF and tamanho >= 4:
            tipo = struct.unpack("<H", fluxo[pos + 6 : pos + 8])[0]
            if tipo == SUBSTREAM_PLANILHA:
                inicios_planilha.append(pos)

    if not boundsheets or len(boundsheets) != len(inicios_planilha):
        return None

    if isinstance(origem, bytes):
        bruto = bytearray(origem)
    else:
        with open(origem, "rb") as arquivo:
            bruto = bytearray(arquivo.read())

    corrigiu = False
    for (pos, tamanho), inicio in zip(boundsheets, inicios_planilha):
        registro = fluxo[pos : pos + 4 + tamanho]
        declarado = struct.unpack("<I", registro[4:8])[0]
        if declarado == inicio:
            continue
        # O fluxo pode estar fragmentado em setores no container OLE, então
        # localizamos o registro pelos próprios bytes. Se ele não aparecer
        # exatamente uma vez, não há como corrigir com segurança.
        primeira = bruto.find(registro)
        if primeira < 0 or bruto.find(registro, primeira + 1) >= 0:
            return None
        bruto[primeira + 4 : primeira + 8] = struct.pack("<I", inicio)
        corrigiu = True

    return bytes(bruto) if corrigiu else None

