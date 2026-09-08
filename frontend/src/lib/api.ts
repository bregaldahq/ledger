/**
 * Cliente HTTP da API de Processamento e Conciliação Contábil.
 * Opera em regime Zero-Storage (transmissão de dados 100% efêmera em memória).
 * 
 * Proteção de Acesso:
 * Envia o Bearer Token em todas as chamadas de API.
 * Notifica a aplicação caso a sessão expire ou o acesso seja revogado (401/403).
 */

import type { RazaoData } from '../types';
import { obterTokenAcesso } from './auth';

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class SessaoExpiradaError extends Error {
  constructor(mensagem: string = 'Sua sessão expirou ou não possui autorização. Faça login novamente.') {
    super(mensagem);
    this.name = 'SessaoExpiradaError';
  }
}

/**
 * Envia uma planilha contábil (.xls ou .xlsx) para processamento em memória e conciliação 1:1.
 */
export async function processarPlanilha(file: File): Promise<RazaoData> {
  const nome = file.name.toLowerCase();
  if (!nome.endsWith('.xls') && !nome.endsWith('.xlsx')) {
    throw new Error('Formato não suportado. Por favor, selecione um arquivo .xls ou .xlsx.');
  }

  const token = await obterTokenAcesso();
  if (!token) {
    throw new SessaoExpiradaError('Acesso bloqueado: usuário não autenticado. Faça login para continuar.');
  }

  const formData = new FormData();
  formData.append('file', file);

  let resposta: Response;
  try {
    resposta = await fetch(`${API_BASE}/api/processar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
  } catch (err) {
    console.error('Falha de rede ao conectar à API:', err);
    throw new Error(
      'Não foi possível conectar ao servidor de processamento. Verifique se a API está online ou sua conexão com a internet.'
    );
  }

  if (resposta.status === 401 || resposta.status === 403) {
    let detalhe = 'Sua sessão expirou ou seu usuário não possui permissão para acessar este projeto.';
    try {
      const errJson = await resposta.json();
      if (errJson?.detail) detalhe = errJson.detail;
    } catch {
      // mantém padrão
    }
    throw new SessaoExpiradaError(detalhe);
  }

  if (!resposta.ok) {
    let mensagemErro = `Erro no processamento (${resposta.status})`;
    try {
      const corpoErro = await resposta.json();
      if (corpoErro && corpoErro.detail) {
        mensagemErro = corpoErro.detail;
      }
    } catch {
      if (resposta.status === 400) {
        mensagemErro = 'Formato não suportado. Envie um arquivo .xls ou .xlsx válido.';
      } else if (resposta.status === 422) {
        mensagemErro = 'Não foi possível ler as colunas contábeis da planilha. Verifique a estrutura do arquivo.';
      } else if (resposta.status >= 500) {
        mensagemErro = 'Ocorreu um erro interno no servidor ao conciliar o razão. Tente novamente em instantes.';
      }
    }
    throw new Error(mensagemErro);
  }

  return (await resposta.json()) as RazaoData;
}

/**
 * Envia os dados do Razão conciliado e retorna o Blob da planilha Excel (.xlsx) colorida.
 */
export async function exportarExcel(dados: RazaoData): Promise<Blob> {
  const token = await obterTokenAcesso();
  if (!token) {
    throw new SessaoExpiradaError('Acesso bloqueado: usuário não autenticado. Faça login para continuar.');
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${API_BASE}/api/exportar-excel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(dados),
    });
  } catch (err) {
    console.error('Falha ao exportar Excel:', err);
    throw new Error(
      'Não foi possível conectar ao servidor para gerar o arquivo Excel. Verifique sua conexão.'
    );
  }

  if (resposta.status === 401 || resposta.status === 403) {
    let detalhe = 'Sua sessão expirou ou seu usuário não possui permissão para exportar.';
    try {
      const errJson = await resposta.json();
      if (errJson?.detail) detalhe = errJson.detail;
    } catch {
      // mantém padrão
    }
    throw new SessaoExpiradaError(detalhe);
  }

  if (!resposta.ok) {
    let detalhe = `Falha ao gerar o Excel (${resposta.status})`;
    try {
      const errJson = await resposta.json();
      if (errJson && errJson.detail) detalhe = errJson.detail;
    } catch {
      // mantém detalhe padrão
    }
    throw new Error(detalhe);
  }

  return await resposta.blob();
}

/**
 * Utilitário de browser para acionar o download do Blob como arquivo no disco do usuário.
 */
export function baixarBlob(blob: Blob, nomeArquivo: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Verifica a saúde da API backend FastAPI.
 */
export async function verificarSaudeApi(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return data.status === 'ok';
    }
    return false;
  } catch {
    return false;
  }
}
