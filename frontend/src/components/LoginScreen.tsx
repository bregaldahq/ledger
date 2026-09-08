import React, { useState } from 'react';
import { login } from '../lib/auth';
import type { Usuario } from '../types';
import { Lock, Mail, AlertCircle, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (usuario: Usuario) => void;
  isLocalDev?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const emailLimpo = email.trim();
    const senhaLimpa = senha.trim();

    if (!emailLimpo || !senhaLimpa) {
      setErro('Por favor, informe seu e-mail e sua senha de acesso.');
      return;
    }

    setCarregando(true);
    try {
      const { usuario, erro: erroAuth } = await login(emailLimpo, senhaLimpa);
      if (erroAuth) {
        setErro(erroAuth);
      } else if (usuario) {
        onLoginSuccess(usuario);
      }
    } catch {
      setErro('Falha inesperada ao tentar autenticar. Por favor, tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
      }}
    >
      {/* Detalhe arquitetural de fundo sutil */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: 'var(--purple)',
        }}
      />

      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '430px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Cartão Central de Login */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-card)',
            padding: '2.25rem 2rem',
            boxShadow: '0 8px 30px rgba(42, 33, 64, 0.07)',
          }}
        >
          {/* Cabeçalho da Marca Bregalda */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              marginBottom: '1.75rem',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '10px',
                backgroundColor: 'var(--purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                boxShadow: '0 4px 12px rgba(75, 46, 131, 0.25)',
              }}
            >
              <img
                src="./brand/icone_bregalda.svg"
                alt="Bregalda"
                style={{ width: '38px', height: '38px', borderRadius: '6px' }}
              />
            </div>

            <span
              className="technical-label"
              style={{
                color: 'var(--purple)',
                marginBottom: '0.35rem',
                letterSpacing: '0.08em',
              }}
            >
              SUÍTE CONTÁBIL
            </span>

            <h1
              style={{
                fontSize: '1.875rem',
                fontWeight: 800,
                color: 'var(--ink)',
                letterSpacing: '-0.03em',
                marginBottom: '0.2rem',
              }}
            >
              Ledger
            </h1>

            <span
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                fontWeight: 500,
                marginBottom: '0.65rem',
              }}
            >
              desenvolvido por Bregalda
            </span>

            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              Acesso restrito. Informe suas credenciais autorizadas para entrar no sistema.
            </p>
          </div>

          {/* Banner de Garantia de Privacidade Zero-Storage */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-control)',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              marginBottom: '1.5rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <ShieldCheck size={16} color="var(--green)" style={{ flexShrink: 0 }} />
            <span>
              <strong style={{ color: 'var(--ink)' }}>Zero-Storage:</strong> Seus dados e planilhas contábeis são processados 100% em memória RAM efêmera.
            </span>
          </div>

          {/* Mensagem de Erro */}
          {erro && (
            <div
              className="animate-shake"
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 'var(--radius-control)',
                padding: '0.75rem 0.85rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                marginBottom: '1.25rem',
                fontSize: '0.8125rem',
                color: '#991B1B',
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{erro}</span>
            </div>
          )}

          {/* Formulário de Autenticação */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {/* Campo E-mail */}
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  marginBottom: '0.35rem',
                }}
              >
                E-mail de Acesso
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={15}
                  color="var(--text-muted)"
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  disabled={carregando}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                    borderRadius: 'var(--radius-control)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--ink)',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--purple)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(75, 46, 131, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <label
                htmlFor="login-senha"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  marginBottom: '0.35rem',
                }}
              >
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  color="var(--text-muted)"
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="login-senha"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  disabled={carregando}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                    borderRadius: 'var(--radius-control)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '0.875rem',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--ink)',
                    outline: 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--purple)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(75, 46, 131, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={carregando}
              className="btn-primary"
              style={{
                marginTop: '0.5rem',
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.9375rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: carregando ? 'not-allowed' : 'pointer',
                opacity: carregando ? 0.75 : 1,
              }}
            >
              {carregando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Ledger</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Rodapé Editorial */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}
        >
          <span>Ledger · Desenvolvido por Bregalda</span>
        </div>
      </div>
    </div>
  );
};
