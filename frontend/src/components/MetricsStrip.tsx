import React from 'react';
import type { RazaoData } from '../types';
import { formatarMoeda } from '../types';
import { Building2, Calendar, CreditCard, CheckCircle2, Clock, AlertTriangle, HelpCircle, FileText } from 'lucide-react';

interface MetricsStripProps {
  dados: RazaoData;
}

export const MetricsStrip: React.FC<MetricsStripProps> = ({ dados }) => {
  const { resumo } = dados;
  const pctCobertura = Math.min(100, Math.max(0, resumo.cobertura_valor || 0));

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-3)',
      }}
    >
      {/* 1. Cabeçalho com Informações da Planilha e Empresa */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-card)',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 2px 8px rgba(42, 33, 64, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.25rem',
              }}
            >
              <Building2 size={18} color="var(--purple)" />
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '-0.01em',
                }}
              >
                {dados.empresa || 'Empresa não identificada'}
              </h2>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
              }}
            >
              {dados.cnpj && (
                <span>
                  <strong style={{ fontWeight: 600, color: 'var(--ink)' }}>CNPJ:</strong>{' '}
                  <span className="font-mono">{dados.cnpj}</span>
                </span>
              )}
              {dados.periodo && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={13} color="var(--purple)" />
                  <strong style={{ fontWeight: 600, color: 'var(--ink)' }}>Período:</strong>{' '}
                  <span>{dados.periodo}</span>
                </span>
              )}
              {dados.arquivo && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <FileText size={13} color="var(--text-muted)" />
                  <span className="font-mono" style={{ fontSize: '0.75rem' }}>
                    {dados.arquivo}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Identificação da Conta Contábil */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-control)',
              padding: '0.5rem 0.85rem',
              textAlign: 'right',
            }}
          >
            <span className="technical-label" style={{ display: 'block', marginBottom: '0.15rem' }}>
              Conta Contábil
            </span>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)' }}>
              {dados.conta ? `${dados.conta} · ` : ''}
              {dados.conta_nome || 'Fornecedores / Contas a Pagar'}
            </div>
          </div>
        </div>

        {/* Barra de Progresso de Cobertura Contábil */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderRadius: 'var(--radius-control)',
            padding: '0.85rem 1rem',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '0.5rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}
              >
                Cobertura Contábil:
              </span>
              <span
                className="font-mono tabular-nums"
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--purple)',
                }}
              >
                {pctCobertura.toFixed(1)}% do valor quitado
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                ({resumo.quitados.qtd} de {resumo.creditos.qtd} compras amarradas)
              </span>
            </div>

            {/* Badges Adicionais de Qualidade */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {resumo.prazo_medio !== null && (
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'var(--purple-subtle)',
                    color: 'var(--purple)',
                    border: '1px solid color-mix(in srgb, var(--purple) 20%, transparent)',
                  }}
                  title="Tempo médio decorrido entre a compra e a quitação"
                >
                  <Clock size={12} />
                  Prazo médio: {Math.round(resumo.prazo_medio)} dias
                </span>
              )}
              {resumo.confere_total && (
                <span className="badge badge-sucesso" title="A soma dos lançamentos bate exatamente com o rodapé do razão">
                  <CheckCircle2 size={12} />
                  Total do Razão Verificado
                </span>
              )}
            </div>
          </div>

          {/* Trilho e Barra de Progresso */}
          <div
            style={{
              width: '100%',
              height: '10px',
              backgroundColor: 'color-mix(in srgb, var(--purple) 10%, #E5E7EB)',
              borderRadius: '5px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${pctCobertura}%`,
                height: '100%',
                backgroundColor: 'var(--yellow)',
                backgroundImage:
                  'linear-gradient(90deg, var(--yellow) 0%, color-mix(in srgb, var(--yellow) 80%, var(--purple)) 100%)',
                borderRadius: '5px',
                transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. Quatro Cartões de Métricas (Adquirido / Quitado / Em Aberto / Sem Par) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Cartão 1: Total Adquirido (Créditos) */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-card)',
            padding: '1rem 1.25rem',
            boxShadow: '0 2px 6px rgba(42, 33, 64, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              backgroundColor: 'var(--ink)',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.35rem',
            }}
          >
            <span className="technical-label">1. Total Adquirido</span>
            <CreditCard size={15} color="var(--text-muted)" />
          </div>
          <div
            className="font-mono tabular-nums"
            style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
              marginBottom: '0.25rem',
            }}
          >
            {formatarMoeda(resumo.creditos.valor)}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            {resumo.creditos.qtd} lançamentos de compras / notas
          </div>
        </div>

        {/* Cartão 2: Quitado e Amarrado (Amarelo Bregalda) */}
        <div
          style={{
            backgroundColor: 'var(--yellow-subtle)',
            border: '1px solid var(--yellow-border)',
            borderRadius: 'var(--radius-card)',
            padding: '1rem 1.25rem',
            boxShadow: '0 2px 6px rgba(245, 196, 0, 0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              backgroundColor: 'var(--yellow)',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.35rem',
            }}
          >
            <span className="technical-label" style={{ color: '#854D0E' }}>
              2. Quitado & Amarrado
            </span>
            <CheckCircle2 size={15} color="#854D0E" />
          </div>
          <div
            className="font-mono tabular-nums"
            style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: '#713F12',
              letterSpacing: '-0.02em',
              marginBottom: '0.25rem',
            }}
          >
            {formatarMoeda(resumo.quitados.valor)}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#854D0E',
              fontWeight: 500,
            }}
          >
            {resumo.quitados.qtd} pares amarrados 1:1 ({resumo.cobertura_qtd.toFixed(1)}%)
          </div>
        </div>

        {/* Cartão 3: Em Aberto (Duplicatas a pagar) */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--red-border)',
            borderRadius: 'var(--radius-card)',
            padding: '1rem 1.25rem',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              backgroundColor: 'var(--red-lapis)',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.35rem',
            }}
          >
            <span className="technical-label" style={{ color: 'var(--red-lapis)' }}>
              3. Em Aberto (A Pagar)
            </span>
            <AlertTriangle size={15} color="var(--red-lapis)" />
          </div>
          <div
            className="font-mono tabular-nums"
            style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--red-lapis)',
              letterSpacing: '-0.02em',
              marginBottom: '0.25rem',
            }}
          >
            {formatarMoeda(resumo.abertos.valor)}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            {resumo.abertos.qtd} notas aguardando pagamento
          </div>
        </div>

        {/* Cartão 4: Pago sem Par (Débitos avulsos) */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--blue-border)',
            borderRadius: 'var(--radius-card)',
            padding: '1rem 1.25rem',
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              backgroundColor: 'var(--blue-lapis)',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.35rem',
            }}
          >
            <span className="technical-label" style={{ color: 'var(--blue-lapis)' }}>
              4. Pago sem Par
            </span>
            <HelpCircle size={15} color="var(--blue-lapis)" />
          </div>
          <div
            className="font-mono tabular-nums"
            style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--blue-lapis)',
              letterSpacing: '-0.02em',
              marginBottom: '0.25rem',
            }}
          >
            {formatarMoeda(resumo.sem_par.valor)}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            {resumo.sem_par.qtd} débitos sem nota de crédito
          </div>
        </div>
      </div>
    </section>
  );
};
