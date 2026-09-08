"""Módulo de Autenticação e Autorização para FastAPI.

Protege endpoints contra chamadas não autenticadas ou de usuários não autorizados.
Valida o JWT Bearer Token contra o Supabase Auth em produção ou tokens de sessão autorizados em desenvolvimento local.
Centraliza todo o fluxo de login e verificação no servidor (Padrão BFF / Zero Keys no Frontend).
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional
import httpx
from fastapi import Header, HTTPException, status


def _carregar_env() -> None:
    """Carrega arquivos .env locais se presentes para desenvolvimento."""
    for caminho in [
        Path(__file__).resolve().parent / ".env",
        Path(__file__).resolve().parent.parent / ".env",
    ]:
        if caminho.exists():
            try:
                for linha in caminho.read_text(encoding="utf-8").splitlines():
                    linha = linha.strip()
                    if linha and not linha.startswith("#") and "=" in linha:
                        chave, valor = linha.split("=", 1)
                        chave = chave.strip()
                        valor = valor.strip().strip("'\"")
                        if chave and chave not in os.environ:
                            os.environ[chave] = valor
            except Exception:
                pass


_carregar_env()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()
ALLOWED_EMAILS_RAW = os.getenv("ALLOWED_EMAILS", "").strip()
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()

# Usuários pré-cadastrados para acesso imediato
USUARIOS_PREDEFINIDOS: dict[str, dict[str, Any]] = {
    "ricardo@bregalda.com.br": {
        "senhas": ["bregalda2026", "123456"],
        "nome": "Ricardo Bregalda",
        "id": "usr_ricardo",
    },
    "mae@bregalda.com.br": {
        "senhas": ["bregalda2026", "123456"],
        "nome": "Mãe do Ricardo",
        "id": "usr_mae",
    },
}


def obter_emails_autorizados() -> list[str]:
    """Retorna lista em minúsculas dos e-mails autorizados, se configurados."""
    if not ALLOWED_EMAILS_RAW:
        return []
    return [e.strip().lower() for e in ALLOWED_EMAILS_RAW.split(",") if e.strip()]


async def autenticar_credenciais(email_raw: str, password_raw: str) -> dict[str, Any]:
    """Autentica as credenciais com o Supabase Auth no backend (ou modo local dev).

    Valida contra whitelist de e-mails autorizados (ALLOWED_EMAILS).
    Retorna {"usuario": {"id": ..., "email": ..., "nome": ...}, "token": ...}.
    """
    email = (email_raw or "").strip().lower()
    password = (password_raw or "").strip()

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Por favor, informe seu e-mail e sua senha de acesso.",
        )

    # 1. Validação prévia de whitelist
    emails_autorizados = obter_emails_autorizados()
    if emails_autorizados and email not in emails_autorizados:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: este e-mail não possui permissão para acessar este projeto.",
        )

    # 2. Autenticação via Supabase Auth (quando configurado no servidor)
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                    headers={
                        "apikey": SUPABASE_ANON_KEY,
                        "Content-Type": "application/json",
                    },
                    json={"email": email, "password": password},
                )
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Falha ao contatar serviço de autenticação: {err}",
            )

        if res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="E-mail ou senha incorretos. Por favor, verifique suas credenciais.",
            )

        data = res.json()
        user = data.get("user") or {}
        access_token = data.get("access_token")

        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Resposta inválida do serviço de autenticação.",
            )

        user_email = (user.get("email") or email).strip().lower()
        if emails_autorizados and user_email not in emails_autorizados:
            # Revoga token imediatamente
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    await client.post(
                        f"{SUPABASE_URL}/auth/v1/logout",
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "apikey": SUPABASE_ANON_KEY,
                        },
                    )
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: seu usuário não possui autorização para este projeto.",
            )

        nome = user.get("user_metadata", {}).get("nome") or user_email.split("@")[0]
        return {
            "usuario": {
                "id": user.get("id", "user"),
                "email": user_email,
                "nome": nome,
            },
            "token": access_token,
        }

    # 3. Modo de Desenvolvimento Local (quando Supabase não configurado)
    if ENVIRONMENT == "production" or os.getenv("RENDER") == "true":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuração de autenticação ausente no servidor de produção.",
        )

    # Validação de credenciais de usuários pré-cadastrados
    if email in USUARIOS_PREDEFINIDOS:
        user_info = USUARIOS_PREDEFINIDOS[email]
        if password not in user_info["senhas"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Senha incorreta para o usuário {email}. Verifique a senha informada.",
            )
        dev_token = f"dev-token-{email}"
        return {
            "usuario": {
                "id": user_info["id"],
                "email": email,
                "nome": user_info["nome"],
            },
            "token": dev_token,
        }

    dev_token = f"dev-token-{email}"
    return {
        "usuario": {
            "id": f"dev-{abs(hash(email))}",
            "email": email,
            "nome": email.split("@")[0],
        },
        "token": dev_token,
    }


async def validar_usuario_autorizado(
    authorization: Optional[str] = Header(None),
) -> dict[str, Any]:
    """Valida o cabeçalho Authorization: Bearer <token>.

    Retorna os dados do usuário autenticado se válido e autorizado.
    Lança HTTPException(401) se ausente ou inválido.
    Lança HTTPException(403) se o usuário não constar na lista de autorizados.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido. Acesso restrito a usuários autenticados.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    partes = authorization.split()
    if len(partes) != 2 or partes[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Formato de token inválido. Esperado 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = partes[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token vazio ou inválido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Validação via Supabase Auth (quando configurado)
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"{SUPABASE_URL}/auth/v1/user",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "apikey": SUPABASE_ANON_KEY,
                    },
                )
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Falha ao contatar serviço de autenticação: {err}",
            )

        if res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de autenticação inválido ou expirado. Faça login novamente.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_data = res.json()
        email = (user_data.get("email") or "").strip().lower()

        # Validação de Whitelist (se configurada)
        emails_autorizados = obter_emails_autorizados()
        if emails_autorizados and email not in emails_autorizados:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: seu usuário não possui autorização para este projeto contábil.",
            )

        nome = user_data.get("user_metadata", {}).get("nome") or email.split("@")[0]
        return {
            "id": user_data.get("id", "user"),
            "email": email,
            "nome": nome,
        }

    # 2. Modo de Desenvolvimento Local (quando Supabase não configurado no backend)
    if ENVIRONMENT == "production" or os.getenv("RENDER") == "true":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuração de autenticação ausente no servidor de produção.",
        )

    # Em ambiente de desenvolvimento local, aceita tokens dev seguros gerados no login
    if token.startswith("dev-token-"):
        email = token.replace("dev-token-", "").strip().lower()
        emails_autorizados = obter_emails_autorizados()
        if emails_autorizados and email not in emails_autorizados:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: seu usuário não possui autorização para este projeto contábil.",
            )
        info_pre = USUARIOS_PREDEFINIDOS.get(email)
        if info_pre:
            return {"id": info_pre["id"], "email": email, "nome": info_pre["nome"]}
        return {"id": f"dev-{abs(hash(email))}", "email": email, "nome": email.split("@")[0]}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de autenticação local inválido.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def encerrar_sessao(token: Optional[str]) -> bool:
    """Envia logout para o Supabase se aplicável."""
    if not token:
        return True

    if SUPABASE_URL and SUPABASE_ANON_KEY and not token.startswith("dev-token-"):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{SUPABASE_URL}/auth/v1/logout",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "apikey": SUPABASE_ANON_KEY,
                    },
                )
        except Exception:
            pass

    return True
