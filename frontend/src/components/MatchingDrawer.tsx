import React, { useEffect } from 'react';
import type { Lancamento } from '../types';
import { formatarMoeda, formatarData } from '../types';
import { X, Link2, Clock, AlertTriangle, CheckCircle2, ArrowDown, HelpCircle } from 'lucide-react';

interface MatchingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lancamento: Lancamento | null;
  parLancamento: Lancamento | null;
}

export const MatchingDrawer: React.FC<MatchingDrawerProps> = ({
  isOpen,
  onClose,
  lancamento,
  parLancamento,
}) => {
  // Fecha a gaveta com a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !lancamento) return null;

  // Organiza quem é a compra (Crédito) e quem é o pagamento (Débito)
  let compra: Lancamento | null = null;
  let pagamento: Lancamento | null = null;

  if (lancamento.tipo === 'C') {
    compra = lancamento;
    pagamento = parLancamento && parLancamento.tipo === 'D' ? parLancamento : null;
  } else {
    pagamento = lancamento;
    compra = parLancamento && parLancamento.tipo === 'C' ? parLancamento : null;
  }

  const isConciliado = lancamento.status === 'conciliado' && (compra !== null || pagamento !== null);
  const dias = lancamento.dias ?? (compra && pagamento ? 0 : null);
  const corroborado = lancamento.corroborado ?? (compra?.corroborado || pagamento?.corroborado);

  return (
    <>
      {/* 1. Backdrop com desfoque e clique para fechar */}
      <div
        onClick={onClose}
        className="animate-fade-in"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(42, 33, 64, 0.45)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 50,
        }}
      />

      {/* 2. Painel Lateral Deslizante (Drawer) */}
      <div
        className="animate-slide-in-right"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '540px',
          backgroundColor: 'var(--cream)',
          borderLeft: '1px solid var(--border-strong)',
          boxShadow: '-10px 0 35px rgba(42, 33, 64, 0.18)',
          zIndex: 51,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Cabeçalho da Gaveta */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: isConciliado ? 'var(--yellow-subtle)' : 'var(--purple-subtle)',
                color: isConciliado ? '#713F12' : 'var(--purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isConciliado ? '1px solid var(--yellow-border)' : '1px solid var(--border-subtle)',
              }}
            >
              <Link2 size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: 'var(--ink)',
                  }}
                >
                  {isConciliado
                    ? `Amarração #${lancamento.amarracao || 1}`
                    : lancamento.status === 'aberto'
                    ? 'Lançamento em Aberto'
                    : 'Lançamento sem Par'}
                </h3>
                {isConciliado && (
                  <span className="badge badge-conciliado" style={{ fontSize: '0.6875rem' }}>
                    Par 1:1 Conferido
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {isConciliado
                  ? 'Comparação lado a lado da compra e quitação'
                  : 'Detalhes contábeis do lançamento selecionado'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Fechar (Esc)"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Corpo com Detalhes da Amarração */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Se estiver conciliado com par */}
          {isConciliado ? (
            <>
              {/* Alerta de Prazo e Corroboração */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-card)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                {/* Prazo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      padding: '0.35rem',
                      borderRadius: '50%',
                      backgroundColor: 'var(--purple-subtle)',
                      color: 'var(--purple)',
                    }}
                  >
                    <Clock size={16} />
                  </div>
                  <div style={{ fontSize: '0.875rem' }}>
                    <strong style={{ color: 'var(--ink)' }}>Prazo de Quitação:</strong>{' '}
                    <span className="font-mono tabular-nums" style={{ fontWeight: 600, color: 'var(--purple)' }}>
                      {dias === 0 ? 'Quitado no mesmo dia (0 dias)' : `${dias} dias`}
                    </span>{' '}
                    entre a data da compra e o pagamento.
                  </div>
                </div>

                {/* Fornecedor Corroborado ou Vale Conferir */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '0.65rem',
                  }}
                >
                  <div
                    style={{
                      padding: '0.35rem',
                      borderRadius: '50%',
                      backgroundColor: corroborado ? 'var(--green-subtle)' : 'var(--yellow-subtle)',
                      color: corroborado ? '#15803D' : '#854D0E',
                      flexShrink: 0,
                    }}
                  >
                    {corroborado ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  </div>
                  <div style={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>
                    {corroborado ? (
                      <span style={{ color: '#15803D', fontWeight: 500 }}>
                        ✓ <strong>Fornecedor Confirmado:</strong> O mesmo nome/fornecedor foi identificado tanto na nota quanto no pagamento.
                      </span>
                    ) : (
                      <span style={{ color: '#854D0E', fontWeight: 500 }}>
                        ⚠️ <strong>Vale Conferir:</strong> Os textos dos históricos possuem pequenas variações no nome do fornecedor ou utilizam descrições resumidas.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* CARD 1: A Compra (Crédito) */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--yellow-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '1.25rem',
                  boxShadow: '0 2px 8px rgba(42, 33, 64, 0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                  }}
                >
                  <span
                    className="technical-label"
                    style={{
                      color: '#854D0E',
                      backgroundColor: 'var(--yellow-subtle)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '3px',
                      fontWeight: 600,
                    }}
                  >
                    1. A COMPRA (CRÉDITO)
                  </span>
                  <span
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: '#713F12',
                    }}
                  >
                    {formatarMoeda(compra?.valor)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Data do Lançamento:</span>
                    <span className="font-mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      {formatarData(compra?.data)}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Histórico Completo:</span>
                    <div
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-control)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--ink)',
                        lineHeight: 1.4,
                      }}
                    >
                      {compra?.historico}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Conta Contrapartida:</span>
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {compra?.contrapartida || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conector Visual Central */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '-0.5rem 0',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--purple)',
                    color: 'var(--cream)',
                    borderRadius: '50%',
                    padding: '0.35rem',
                    boxShadow: '0 2px 6px rgba(75, 46, 131, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowDown size={16} />
                </div>
              </div>

              {/* CARD 2: O Pagamento (Débito) */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--purple)',
                  borderRadius: 'var(--radius-card)',
                  padding: '1.25rem',
                  boxShadow: '0 2px 8px rgba(42, 33, 64, 0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                  }}
                >
                  <span
                    className="technical-label"
                    style={{
                      color: 'var(--purple)',
                      backgroundColor: 'var(--purple-subtle)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '3px',
                      fontWeight: 600,
                    }}
                  >
                    2. O PAGAMENTO (DÉBITO)
                  </span>
                  <span
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: 'var(--purple)',
                    }}
                  >
                    {formatarMoeda(pagamento?.valor)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Data da Quitação:</span>
                    <span className="font-mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      {formatarData(pagamento?.data)}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Histórico Completo:</span>
                    <div
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-control)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--ink)',
                        lineHeight: 1.4,
                      }}
                    >
                      {pagamento?.historico}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Conta Contrapartida:</span>
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {pagamento?.contrapartida || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Se for lançamento não conciliado (aberto ou sem par) */
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-card)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: lancamento.status === 'aberto' ? 'var(--red-subtle)' : 'var(--blue-subtle)',
                  borderRadius: 'var(--radius-control)',
                  color: lancamento.status === 'aberto' ? 'var(--red-lapis)' : 'var(--blue-lapis)',
                }}
              >
                {lancamento.status === 'aberto' ? <AlertTriangle size={18} /> : <HelpCircle size={18} />}
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  {lancamento.status === 'aberto'
                    ? 'Esta duplicata de compra ainda está em aberto'
                    : 'Este pagamento não encontrou duplicata correspondente'}
                </div>
              </div>

              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {lancamento.status === 'aberto'
                  ? 'Não foi encontrado nenhum lançamento de débito (pagamento) no mesmo valor para quitar esta nota fiscal no período analisado.'
                  : 'Foi lançado um débito financeiro, porém não há crédito de mercadoria ou serviço com valor equivalente no razão.'}
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.8125rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Valor:</span>
                  <span className="font-mono tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)' }}>
                    {formatarMoeda(lancamento.valor)}
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Data:</span>
                  <span className="font-mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                    {formatarData(lancamento.data)}
                  </span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Histórico:</span>
                  <div
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--ink)',
                      lineHeight: 1.4,
                      marginTop: '0.25rem',
                    }}
                  >
                    {lancamento.historico}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Contrapartida:</span>
                  <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {lancamento.contrapartida || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé da Gaveta com Botão de Fechar */}
        <div
          style={{
            marginTop: 'auto',
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ width: '100%', minHeight: '38px' }}
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </>
  );
};
