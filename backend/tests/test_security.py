"""Testes Automatizados de Segurança e Blindagem de Acesso.

Garante que:
1. Ninguém acesse ou processe planilhas sem cabeçalho Authorization válido (401).
2. Tokens forjados ou vazios sejam imediatamente rejeitados (401).
3. E-mails fora da lista de autorizados sejam bloqueados (403).
4. O bundle e código do frontend não contenham chaves administrativas (service_role, segredos, etc.).
"""

import os
from pathlib import Path
from fastapi.testclient import TestClient
import pytest

from backend.api import app
from backend import auth

client = TestClient(app)
RAIZ = Path(__file__).resolve().parent.parent.parent


def test_processar_sem_token_retorna_401():
    """Tentar enviar planilha sem cabeçalho Authorization deve retornar 401."""
    response = client.post(
        "/api/processar",
        files={"file": ("teste.xlsx", b"dummy", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 401
    assert "Token de autenticação não fornecido" in response.json()["detail"]


def test_exportar_sem_token_retorna_401():
    """Tentar exportar sem cabeçalho Authorization deve retornar 401."""
    response = client.post(
        "/api/exportar-excel",
        json={"arquivo": "teste.xlsx"},
    )
    assert response.status_code == 401
    assert "Token de autenticação não fornecido" in response.json()["detail"]


def test_token_com_formato_invalido_retorna_401():
    """Header sem prefixo 'Bearer' deve ser rejeitado."""
    response = client.post(
        "/api/processar",
        headers={"Authorization": "Basic 12345"},
        files={"file": ("teste.xlsx", b"dummy", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 401
    assert "Formato de token inválido" in response.json()["detail"]


def test_token_forjado_retorna_401():
    """Token inexistente/inválido deve ser recusado com 401."""
    response = client.post(
        "/api/processar",
        headers={"Authorization": "Bearer token_falso_123"},
        files={"file": ("teste.xlsx", b"dummy", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 401


def test_email_fora_da_whitelist_retorna_403(monkeypatch):
    """Quando ALLOWED_EMAILS está configurado, usuários de outro e-mail recebem 403."""
    monkeypatch.setattr(auth, "ALLOWED_EMAILS_RAW", "mae@dominio.com.br,ricardo@bregalda.com.br")

    # Tenta com e-mail não autorizado
    response = client.post(
        "/api/processar",
        headers={"Authorization": "Bearer dev-token-invasor@desconhecido.com"},
        files={"file": ("teste.xlsx", b"dummy", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 403
    assert "Acesso negado" in response.json()["detail"]

    # Tenta com e-mail autorizado da whitelist -> deve passar na auth
    # (pode falhar depois apenas no formato da planilha dummy, mas NÃO por 401/403)
    res_autorizado = client.post(
        "/api/processar",
        headers={"Authorization": "Bearer dev-token-mae@dominio.com.br"},
        files={"file": ("teste.xlsx", b"dummy", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert res_autorizado.status_code != 401
    assert res_autorizado.status_code != 403


def test_auditoria_seguranca_ausencia_de_chaves_secretas_no_frontend():
    """Varre todo o código fonte e bundle do frontend.

    Verifica se nenhum segredo administrativo (service_role, senhas, chaves privadas)
    foi acidentalmente injetado ou compilado no frontend.
    """
    import re
    diretorio_frontend = RAIZ / "frontend"
    assert diretorio_frontend.exists()

    termos_estritamente_proibidos_em_codigo = [
        "service_role",
        "SUPABASE_SERVICE_ROLE",
        "POSTGRES_PASSWORD",
        "PRIVATE KEY-----",
    ]

    # 1. Audita todo o código fonte de src/ e bundle dist/
    arquivos_codigo = []
    pasta_src = diretorio_frontend / "src"
    for arquivo in pasta_src.rglob("*.*"):
        if arquivo.suffix in (".ts", ".tsx", ".css", ".html", ".json"):
            arquivos_codigo.append(arquivo)

    pasta_dist = diretorio_frontend / "dist"
    if pasta_dist.exists():
        for arquivo in pasta_dist.rglob("*.js"):
            arquivos_codigo.append(arquivo)

    assert len(arquivos_codigo) > 5, "Poucos arquivos de código encontrados para auditoria."

    for arq in arquivos_codigo:
        conteudo = arq.read_text(encoding="utf-8", errors="ignore")
        for termo in termos_estritamente_proibidos_em_codigo:
            assert termo not in conteudo, (
                f"ALERTA CRÍTICO DE SEGURANÇA: Termo proibido '{termo}' encontrado no arquivo {arq.relative_to(RAIZ)}"
            )

    # 2. Audita arquivos de ambiente (.env*) para garantir que nenhum segredo use prefixo VITE_
    arquivos_env = list(diretorio_frontend.glob(".env*")) + list(RAIZ.glob(".env*"))
    for arq_env in arquivos_env:
        conteudo = arq_env.read_text(encoding="utf-8", errors="ignore")
        # Procura por atribuições do tipo VITE_...SERVICE_ROLE= ou VITE_...SECRET=
        match_perigoso = re.search(r"^\s*VITE_[^\n=]*(SERVICE_ROLE|SECRET|PASSWORD|PRIVATE_KEY)\s*=", conteudo, re.IGNORECASE | re.MULTILINE)
        assert match_perigoso is None, (
            f"ALERTA CRÍTICO: Variável perigosa atribuída com prefixo VITE_ no arquivo {arq_env.relative_to(RAIZ)}"
        )


def test_auditoria_zero_keys_frontend():
    """Garante que o frontend não possui nenhuma dependência do Supabase nem chaves VITE_SUPABASE_*."""
    diretorio_frontend = RAIZ / "frontend"
    pkg_json = (diretorio_frontend / "package.json").read_text(encoding="utf-8")
    assert "@supabase/supabase-js" not in pkg_json, "Dependência @supabase/supabase-js ainda presente no package.json!"

    pasta_src = diretorio_frontend / "src"
    for arquivo in pasta_src.rglob("*.*"):
        if arquivo.suffix in (".ts", ".tsx"):
            conteudo = arquivo.read_text(encoding="utf-8")
            assert "from '@supabase/supabase-js'" not in conteudo, (
                f"Importação de @supabase/supabase-js encontrada em {arquivo.relative_to(RAIZ)}"
            )
            assert "VITE_SUPABASE_URL" not in conteudo, (
                f"Uso de VITE_SUPABASE_URL encontrado em {arquivo.relative_to(RAIZ)}"
            )
            assert "VITE_SUPABASE_ANON_KEY" not in conteudo, (
                f"Uso de VITE_SUPABASE_ANON_KEY encontrado em {arquivo.relative_to(RAIZ)}"
            )


def test_login_com_whitelist_bloqueia_403(monkeypatch):
    """Tentativa de login com e-mail fora da whitelist deve retornar 403 Forbidden no BFF."""
    monkeypatch.setattr(auth, "ALLOWED_EMAILS_RAW", "mae@dominio.com.br,ricardo@bregalda.com.br")
    response = client.post(
        "/api/auth/login",
        json={"email": "hacker@desconhecido.com", "password": "senha"},
    )
    assert response.status_code == 403
    assert "Acesso negado" in response.json()["detail"]


def test_producao_sem_supabase_falha_fechado(monkeypatch):
    """Em modo de produção, se Supabase não estiver configurado no servidor, o sistema DEVE falhar fechado (500), nunca permitindo bypass."""
    monkeypatch.setattr(auth, "ENVIRONMENT", "production")
    monkeypatch.setattr(auth, "SUPABASE_URL", "")
    monkeypatch.setattr(auth, "SUPABASE_ANON_KEY", "")
    monkeypatch.setattr(auth, "ALLOWED_EMAILS_RAW", "")

    # Login deve falhar com 500 (Fail-Closed)
    res_login = client.post(
        "/api/auth/login",
        json={"email": "mae@dominio.com.br", "password": "senha"},
    )
    assert res_login.status_code == 500
    assert "Configuração de autenticação ausente" in res_login.json()["detail"]

    # Validação de token em produção sem Supabase configurado deve falhar com 500
    res_me = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer dev-token-qualquer"},
    )
    assert res_me.status_code == 500

