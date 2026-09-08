"""API REST FastAPI para o Conferidor de Razão na Nuvem.

Processamento 100% em memória (zero-storage) de arquivos .xls e .xlsx.
"""

from __future__ import annotations

import io
import os
import re
from typing import Any, Optional

from fastapi import Body, Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from . import ledger, reconciler, xlsx_exporter, xlsx_reader
from .auth import (
    autenticar_credenciais,
    encerrar_sessao,
    validar_usuario_autorizado,
)
from .xls_reader import ArquivoInvalido

app = FastAPI(
    title="Conferidor de Razão API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "app": "conferidor-razao"}


class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/api/auth/login")
async def auth_login(body: LoginRequest) -> dict[str, Any]:
    """Endpoint de login seguro no backend (BFF)."""
    resultado = await autenticar_credenciais(body.email, body.password)
    return resultado


@app.get("/api/auth/me")
async def auth_me(
    usuario: dict[str, Any] = Depends(validar_usuario_autorizado),
) -> dict[str, Any]:
    """Retorna dados do usuário autenticado a partir do Bearer Token."""
    return {"usuario": usuario}


@app.post("/api/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)) -> dict[str, str]:
    """Encerra a sessão do usuário."""
    token = None
    if authorization:
        partes = authorization.split()
        if len(partes) == 2 and partes[0].lower() == "bearer":
            token = partes[1]
    await encerrar_sessao(token)
    return {"status": "ok"}


@app.post("/api/processar")
async def processar(
    file: UploadFile = File(...),
    usuario: dict[str, Any] = Depends(validar_usuario_autorizado),
) -> dict[str, Any]:
    nome_arquivo = file.filename or ""
    ext = os.path.splitext(nome_arquivo)[1].lower()

    if ext not in (".xls", ".xlsx"):
        raise HTTPException(
            status_code=400,
            detail="Formato não suportado. Envie um arquivo .xls ou .xlsx",
        )

    # Leitura 100% em RAM - Zero Storage
    conteudo = await file.read()

    try:
        if ext == ".xlsx":
            razao = xlsx_reader.ler(conteudo, nome_arquivo=nome_arquivo)
        else:
            razao = ledger.ler(conteudo, nome_arquivo=nome_arquivo)
    except ArquivoInvalido as erro:
        raise HTTPException(status_code=422, detail=str(erro))
    except Exception as erro:
        raise HTTPException(
            status_code=422,
            detail=f"Falha ao processar a planilha {nome_arquivo}: {erro}",
        )

    resumo = reconciler.conciliar(razao)
    return {**razao.como_dicionario(), "resumo": resumo}


@app.post("/api/exportar-excel")
async def exportar_excel(
    razao_dict: dict = Body(...),
    usuario: dict[str, Any] = Depends(validar_usuario_autorizado),
) -> StreamingResponse:
    try:
        bytes_xlsx = xlsx_exporter.gerar_xlsx_colorido(razao_dict)
    except Exception as erro:
        raise HTTPException(
            status_code=422,
            detail=f"Erro ao gerar arquivo Excel: {erro}",
        )

    nome = razao_dict.get("arquivo") or "razao"
    if nome.lower().endswith((".xls", ".xlsx")):
        nome = os.path.splitext(nome)[0]

    # Higieniza o nome para o header HTTP
    nome_limpo = re.sub(r'[\r\n"]', "", nome).strip()
    if not nome_limpo:
        nome_limpo = "razao"

    filename = f"conferencia_{nome_limpo}.xlsx"

    return StreamingResponse(
        io.BytesIO(bytes_xlsx),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.api:app", host="0.0.0.0", port=8000, reload=True)
