"""Servidor do conferidor de razão.

Uso:
    python app.py                 # abre em http://localhost:8765
    python app.py --porta 9000
    python app.py --pasta "C:/caminho/com/os/xls"
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import sys
import threading
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from backend import ledger, reconciler, xls_reader

RAIZ = Path(__file__).resolve().parent
WEB = RAIZ / "web"

PASTA_DADOS = RAIZ
_cache: dict[tuple[str, float], dict] = {}


def planilhas() -> list[Path]:
    arquivos = [
        caminho
        for caminho in PASTA_DADOS.iterdir()
        if caminho.is_file()
        and caminho.suffix.lower() in (".xls", ".xlsx")
        and not caminho.name.startswith("~$")
    ]
    return sorted(arquivos, key=lambda c: c.name.lower())


def analisar(caminho: Path) -> dict:
    chave = (caminho.name, caminho.stat().st_mtime)
    if chave not in _cache:
        razao = ledger.ler(str(caminho), caminho.name)
        resumo = reconciler.conciliar(razao)
        if len(_cache) >= 8:
            _cache.pop(next(iter(_cache)))
        _cache[chave] = {**razao.como_dicionario(), "resumo": resumo}
    return _cache[chave]


def descrever(caminho: Path) -> dict:
    """Ficha do arquivo para o seletor — um arquivo ruim não derruba a lista."""
    ficha = {"nome": caminho.name, "tamanho": caminho.stat().st_size}
    try:
        dados = analisar(caminho)
    except Exception as erro:  # noqa: BLE001 - a lista precisa continuar
        return {**ficha, "erro": str(erro)}
    return {
        **ficha,
        "conta": dados["conta"],
        "periodo": dados["periodo"],
        "lancamentos": len(dados["lancamentos"]),
        "colunas_ordenadas": dados["colunas_ordenadas"],
    }


class Manipulador(BaseHTTPRequestHandler):
    server_version = "ConferidorRazao"

    def do_GET(self):  # noqa: N802 - assinatura da biblioteca padrão
        rota = urlparse(self.path)
        try:
            if rota.path == "/api/arquivos":
                self._json(
                    {
                        "pasta": str(PASTA_DADOS),
                        "arquivos": [descrever(c) for c in planilhas()],
                    }
                )
            elif rota.path == "/api/razao":
                self._razao(parse_qs(rota.query).get("arquivo", [""])[0])
            elif rota.path in ("/", "/index.html"):
                self._estatico("index.html")
            elif rota.path.startswith("/static/"):
                self._estatico(rota.path[len("/static/") :])
            else:
                self._erro(HTTPStatus.NOT_FOUND, "página não encontrada")
        except BrokenPipeError:
            pass
        except Exception as erro:  # noqa: BLE001 - a resposta precisa sair
            self._erro(HTTPStatus.INTERNAL_SERVER_ERROR, str(erro))

    def _razao(self, nome: str):
        escolhido = next((c for c in planilhas() if c.name == nome), None)
        if escolhido is None:
            escolhido = next(iter(planilhas()), None)
        if escolhido is None:
            self._erro(
                HTTPStatus.NOT_FOUND,
                f"nenhuma planilha .xls encontrada em {PASTA_DADOS}",
            )
            return
        try:
            self._json(analisar(escolhido))
        except xls_reader.ArquivoInvalido as erro:
            self._erro(HTTPStatus.UNPROCESSABLE_ENTITY, str(erro))

    def _estatico(self, nome: str):
        caminho = (WEB / nome).resolve()
        if WEB not in caminho.parents or not caminho.is_file():
            self._erro(HTTPStatus.NOT_FOUND, "arquivo não encontrado")
            return
        tipo = mimetypes.guess_type(caminho.name)[0] or "application/octet-stream"
        self._responder(
            HTTPStatus.OK, caminho.read_bytes(), f"{tipo}; charset=utf-8"
        )

    def _json(self, dados: dict, status=HTTPStatus.OK):
        corpo = json.dumps(dados, ensure_ascii=False).encode("utf-8")
        self._responder(status, corpo, "application/json; charset=utf-8")

    def _erro(self, status, mensagem: str):
        self._json({"erro": mensagem}, status)

    def _responder(self, status, corpo: bytes, tipo: str):
        self.send_response(status)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(corpo)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(corpo)

    def log_message(self, formato, *args):
        pass


def main():
    global PASTA_DADOS

    analisador = argparse.ArgumentParser(description="Conferidor de Razão")
    analisador.add_argument("--porta", type=int, default=8765)
    analisador.add_argument("--pasta", default=str(RAIZ))
    analisador.add_argument(
        "--sem-navegador", action="store_true", help="não abrir o navegador"
    )
    argumentos = analisador.parse_args()

    PASTA_DADOS = Path(argumentos.pasta).resolve()
    if not PASTA_DADOS.is_dir():
        sys.exit(f"pasta inexistente: {PASTA_DADOS}")

    endereco = f"http://localhost:{argumentos.porta}"
    servidor = ThreadingHTTPServer(("127.0.0.1", argumentos.porta), Manipulador)

    encontrados = planilhas()
    print(f"Conferidor de Razao em {endereco}")
    print(f"Pasta: {PASTA_DADOS}")
    print(f"Planilhas: {len(encontrados)}")
    for caminho in encontrados:
        print(f"  - {caminho.name}")
    print("Ctrl+C para encerrar.")

    if not argumentos.sem_navegador:
        threading.Timer(0.6, webbrowser.open, args=[endereco]).start()

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrado.")
        servidor.shutdown()


if __name__ == "__main__":
    main()
