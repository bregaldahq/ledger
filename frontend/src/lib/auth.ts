/**
 * Módulo de Autenticação BFF (Backend-for-Frontend).
 * 
 * Regra de Segurança Rigorosa: ZERO KEYS NO FRONTEND.
 * O frontend não possui nenhuma chave do Supabase ou de provedores externos.
 * Todas as requisições de login, validação de sessão e logout são intermediadas
 * exclusivamente pela própria API backend (/api/auth/*).
 */

import type { Usuario, SessaoAuth } from '../types';

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const CHAVE_SESSAO = 'conferidor_sessao';

interface SessaoArmazenada {
  usuario: Usuario;
  token: string;
}

/**
 * Retorna o token de acesso ativo armazenado na sessão do navegador (ou null).
 */
export function obterTokenAcesso(): string | null {
  try {
    const raw = sessionStorage.getItem(CHAVE_SESSAO);
    if (!raw) return null;
    const sessao = JSON.parse(raw) as SessaoArmazenada;
    return sessao?.token || null;
  } catch {
    return null;
  }
}

/**
 * Obtém a sessão atual do usuário, validando o token diretamente no backend (/api/auth/me).
 */
export async function obterSessao(): Promise<SessaoAuth> {
  const token = obterTokenAcesso();
  if (!token) {
    return { usuario: null, isLocalDev: false };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.usuario) {
        return {
          usuario: data.usuario,
          isLocalDev: token.startsWith('dev-token-'),
        };
      }
    }

    // Token expirado ou inválido: limpa o storage
    sessionStorage.removeItem(CHAVE_SESSAO);
    return { usuario: null, isLocalDev: false };
  } catch {
    // Falha de rede ou timeout: tenta manter com base na sessão armazenada em cache
    try {
      const raw = sessionStorage.getItem(CHAVE_SESSAO);
      if (raw) {
        const sessao = JSON.parse(raw) as SessaoArmazenada;
        if (sessao?.usuario) {
          return {
            usuario: sessao.usuario,
            isLocalDev: token.startsWith('dev-token-'),
          };
        }
      }
    } catch {
      // ignore
    }
    return { usuario: null, isLocalDev: false };
  }
}

/**
 * Realiza login do usuário enviando as credenciais para o backend (/api/auth/login).
 */
export async function login(
  emailRaw: string,
  passwordRaw: string
): Promise<{ usuario: Usuario | null; erro: string | null }> {
  const email = (emailRaw || '').trim().toLowerCase();
  const password = (passwordRaw || '').trim();

  if (!email || !password) {
    return { usuario: null, erro: 'Por favor, informe seu e-mail e sua senha de acesso.' };
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let detalhe = '';
      try {
        const errJson = await res.json();
        if (errJson?.detail) detalhe = errJson.detail;
      } catch {
        // fallback
      }

      if (!detalhe) {
        if (res.status === 401) {
          detalhe = 'E-mail ou senha incorretos. Verifique suas credenciais.';
        } else if (res.status === 404) {
          detalhe = 'Servidor da API não encontrado (404). Verifique se o backend está ativo e configurado na variável VITE_API_URL.';
        } else if (res.status === 500) {
          detalhe = 'Erro interno no backend (500). Verifique as variáveis do Supabase (URL e chaves) no Render.';
        } else if (res.status === 502 || res.status === 503) {
          detalhe = 'O servidor backend está iniciando ou temporariamente em suspensão (502/503). Aguarde cerca de 30 segundos.';
        } else {
          detalhe = `Falha na autenticação (código HTTP ${res.status}).`;
        }
      }
      return { usuario: null, erro: detalhe };
    }

    const data = await res.json();
    const usuario: Usuario = data.usuario;
    const token: string = data.token;

    if (!usuario || !token) {
      return { usuario: null, erro: 'Resposta inválida do servidor de autenticação.' };
    }

    sessionStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ usuario, token })
    );

    return { usuario, erro: null };
  } catch (err) {
    console.error('Falha de rede ao tentar autenticar:', err);
    const destino = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
    return {
      usuario: null,
      erro: `Não foi possível conectar à API (${destino || 'URL não configurada'}). Verifique se o backend está ativo no Render.`,
    };
  }
}

/**
 * Encerra a sessão ativa informando o backend (/api/auth/logout) e limpando o armazenamento local.
 */
export async function logout(): Promise<{ erro: string | null }> {
  const token = obterTokenAcesso();
  sessionStorage.removeItem(CHAVE_SESSAO);

  if (token) {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch {
      // falha silenciosa de rede ao deslogar
    }
  }

  return { erro: null };
}

/**
 * Listener simples para compatibilidade com o ciclo de vida do App.
 */
export function onAuthStateChange(
  callback: (usuario: Usuario | null, isLocalDev: boolean) => void
): () => void {
  // Dispara uma vez com o estado atual salvo em sessionStorage
  const token = obterTokenAcesso();
  if (token) {
    try {
      const raw = sessionStorage.getItem(CHAVE_SESSAO);
      if (raw) {
        const sessao = JSON.parse(raw) as SessaoArmazenada;
        if (sessao?.usuario) {
          callback(sessao.usuario, token.startsWith('dev-token-'));
          return () => {};
        }
      }
    } catch {
      // ignore
    }
  }

  callback(null, false);
  return () => {};
}
