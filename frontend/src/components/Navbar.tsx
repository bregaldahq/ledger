import React from 'react';
import type { Usuario } from '../types';
import { ArrowLeftRight, LogOut, User } from 'lucide-react';

interface NavbarProps {
  apiOnline: boolean;
  hasData: boolean;
  onReset: () => void;
  usuario: Usuario;
  isLocal: boolean;
  onLogout: () => void;
  onCheckHealth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  apiOnline,
  hasData,
  onReset,
  usuario,
  isLocal,
  onLogout,
  onCheckHealth,
}) => {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: 'var(--nav-height)',
        backgroundColor: 'color-mix(in srgb, var(--cream) 94%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--page-gutter)',
      }}
    >
      {/* Lado Esquerdo: Marca Bregalda & Título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <img
            src="/brand/icone_bregalda.svg"
            alt="Bregalda"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              boxShadow: '0 2px 6px rgba(75, 46, 131, 0.15)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '1.1875rem',
                  color: 'var(--ink)',
                  letterSpacing: '-0.03em',
                }}
              >
                Ledger
              </span>
              <span
                style={{
                  color: 'var(--border-strong)',
                  fontSize: '0.875rem',
                  userSelect: 'none',
                }}
              >
                /
              </span>
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--purple)',
                  letterSpacing: '-0.01em',
                }}
              >
                Conferidor de Razão
              </span>
            </div>
            <div
              style={{
                fontSize: '0.6875rem',
                color: 'var(--text-muted)',
                fontWeight: 500,
                lineHeight: 1.1,
              }}
            >
              desenvolvido por Bregalda
            </div>
          </div>
        </div>
      </div>

      {/* Lado Direito: Status, Trocar Planilha e Acesso */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Indicador de Status da API */}
        <button
          type="button"
          onClick={onCheckHealth}
          title={apiOnline ? 'Servidor de processamento ativo e responsivo' : 'Tentando conectar ao servidor...'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-badge)',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
            backgroundColor: apiOnline ? 'var(--green-subtle)' : 'var(--yellow-subtle)',
            color: apiOnline ? '#15803D' : '#854D0E',
            border: `1px solid ${apiOnline ? '#86EFAC' : 'var(--yellow-border)'}`,
            transition: 'all 0.15s ease',
          }}
        >
          {apiOnline ? (
            <>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--green)',
                  display: 'inline-block',
                }}
              />
              <span>API Online</span>
            </>
          ) : (
            <>
              <span
                className="animate-spin"
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  border: '2px solid var(--yellow)',
                  borderTopColor: 'transparent',
                  display: 'inline-block',
                }}
              />
              <span>Conectando...</span>
            </>
          )}
        </button>

        {/* Botão de Trocar Planilha (quando houver dados) */}
        {hasData && (
          <button
            type="button"
            onClick={onReset}
            className="btn-secondary"
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8125rem',
              minHeight: '34px',
              gap: '0.4rem',
            }}
            title="Fechar planilha atual e carregar uma nova"
          >
            <ArrowLeftRight size={14} color="var(--purple)" />
            <span>Trocar Planilha</span>
          </button>
        )}

        {/* Identificação e Autenticação */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.25rem 0.5rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-control)',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'var(--purple-subtle)',
              color: 'var(--purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={13} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--ink)',
                lineHeight: 1.1,
                maxWidth: '130px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={usuario.email}
            >
              {usuario.nome || usuario.email.split('@')[0]}
            </span>
            {isLocal && (
              <span
                style={{
                  fontSize: '0.625rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                Modo Local
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Sair da conta"
            style={{
              padding: '0.25rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2px',
              marginLeft: '0.25rem',
            }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </header>
  );
};
