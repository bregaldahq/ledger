import React from 'react';
import type { FiltroStatus } from '../types';
import { Search, X, Download, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

interface ControlsBarProps {
  filtroAtual: FiltroStatus;
  onSelectFiltro: (filtro: FiltroStatus) => void;
  termoBusca: string;
  onBuscaChange: (termo: string) => void;
  onExportarExcel: () => void;
  isExportingExcel: boolean;
  onExportarCsv: () => void;
  totalLancamentos: number;
  lancamentosFiltrados: number;
  contagemQuitados: number;
  contagemAbertos: number;
  contagemSemPar: number;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  filtroAtual,
  onSelectFiltro,
  termoBusca,
  onBuscaChange,
  onExportarExcel,
  isExportingExcel,
  onExportarCsv,
  totalLancamentos,
  lancamentosFiltrados,
  contagemQuitados,
  contagemAbertos,
  contagemSemPar,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-card)',
        padding: '1rem 1.25rem',
        boxShadow: '0 2px 8px rgba(42, 33, 64, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        marginBottom: 'var(--space-3)',
      }}
    >
      {/* Linha Superior: Filtros Rápidos + Busca Instantânea */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        {/* Filtros Rápidos */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Botão Todos */}
          <button
            type="button"
            onClick={() => onSelectFiltro('todos')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-control)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              backgroundColor: filtroAtual === 'todos' ? 'var(--purple)' : 'var(--bg-surface-subtle)',
              color: filtroAtual === 'todos' ? '#FFFFFF' : 'var(--ink)',
              border: `1px solid ${filtroAtual === 'todos' ? 'var(--purple)' : 'var(--border-strong)'}`,
              transition: 'all 0.15s ease',
            }}
          >
            Todos ({totalLancamentos})
          </button>

          {/* Botão Quitados (Grifados) */}
          <button
            type="button"
            onClick={() => onSelectFiltro('conciliado')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-control)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: filtroAtual === 'conciliado' ? 'var(--yellow)' : 'var(--yellow-subtle)',
              color: '#713F12',
              border: `1px solid ${filtroAtual === 'conciliado' ? '#B45309' : 'var(--yellow-border)'}`,
              transition: 'all 0.15s ease',
            }}
            title="Lançamentos quitados e amarrados 1:1 (destacados em amarelo)"
          >
            <CheckCircle2 size={13} color="#713F12" />
            <span>Quitados (Grifados)</span>
            <span
              className="font-mono tabular-nums"
              style={{
                fontSize: '0.75rem',
                backgroundColor: 'rgba(255,255,255,0.6)',
                padding: '0.1rem 0.35rem',
                borderRadius: '3px',
              }}
            >
              {contagemQuitados}
            </span>
          </button>

          {/* Botão Em Aberto */}
          <button
            type="button"
            onClick={() => onSelectFiltro('aberto')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-control)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: filtroAtual === 'aberto' ? 'var(--red-lapis)' : 'var(--red-subtle)',
              color: filtroAtual === 'aberto' ? '#FFFFFF' : 'var(--red-lapis)',
              border: `1px solid ${filtroAtual === 'aberto' ? 'var(--red-lapis)' : 'var(--red-border)'}`,
              transition: 'all 0.15s ease',
            }}
            title="Notas de compra que ainda não foram pagas"
          >
            <AlertTriangle size={13} />
            <span>Em Aberto</span>
            <span
              className="font-mono tabular-nums"
              style={{
                fontSize: '0.75rem',
                backgroundColor: filtroAtual === 'aberto' ? 'rgba(255,255,255,0.2)' : 'rgba(220,38,38,0.1)',
                padding: '0.1rem 0.35rem',
                borderRadius: '3px',
              }}
            >
              {contagemAbertos}
            </span>
          </button>

          {/* Botão Sem Par */}
          <button
            type="button"
            onClick={() => onSelectFiltro('sem_par')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-control)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: filtroAtual === 'sem_par' ? 'var(--blue-lapis)' : 'var(--blue-subtle)',
              color: filtroAtual === 'sem_par' ? '#FFFFFF' : 'var(--blue-lapis)',
              border: `1px solid ${filtroAtual === 'sem_par' ? 'var(--blue-lapis)' : 'var(--blue-border)'}`,
              transition: 'all 0.15s ease',
            }}
            title="Débitos pagos sem nota correspondente"
          >
            <HelpCircle size={13} />
            <span>Sem Par</span>
            <span
              className="font-mono tabular-nums"
              style={{
                fontSize: '0.75rem',
                backgroundColor: filtroAtual === 'sem_par' ? 'rgba(255,255,255,0.2)' : 'rgba(37,99,235,0.1)',
                padding: '0.1rem 0.35rem',
                borderRadius: '3px',
              }}
            >
              {contagemSemPar}
            </span>
          </button>
        </div>

        {/* Campo de Busca Instantânea */}
        <div
          style={{
            position: 'relative',
            flex: '1 1 260px',
            maxWidth: '380px',
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Buscar fornecedor, valor ou data..."
            style={{
              width: '100%',
              padding: '0.5rem 2.25rem 0.5rem 2.25rem',
              fontSize: '0.8125rem',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-primary)',
              transition: 'all 0.15s ease',
            }}
          />
          {termoBusca && (
            <button
              type="button"
              onClick={() => onBuscaChange('')}
              title="Limpar busca"
              style={{
                position: 'absolute',
                right: '0.625rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                padding: '0.2rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Linha Inferior: Contagem de Linhas + Botões de Download */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '0.75rem',
        }}
      >
        {/* Contagem / Telemetria */}
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Exibindo{' '}
          <strong className="font-mono tabular-nums" style={{ color: 'var(--ink)' }}>
            {lancamentosFiltrados}
          </strong>{' '}
          de{' '}
          <span className="font-mono tabular-nums">{totalLancamentos}</span> lançamentos contábeis
          {termoBusca && (
            <span style={{ marginLeft: '0.5rem', color: 'var(--purple)', fontWeight: 500 }}>
              (filtrados por "{termoBusca}")
            </span>
          )}
        </div>

        {/* Ações de Download / Exportação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          {/* Botão Secundário: Baixar CSV */}
          <button
            type="button"
            onClick={onExportarCsv}
            className="btn-secondary"
            style={{
              padding: '0.45rem 0.9rem',
              fontSize: '0.8125rem',
              minHeight: '36px',
            }}
            title="Exportar dados amarrados em formato CSV (compatível com Excel)"
          >
            <FileText size={14} />
            <span>Baixar CSV</span>
          </button>

          {/* Botão Primário em Destaque: Baixar Excel .xlsx Colorido */}
          <button
            type="button"
            onClick={onExportarExcel}
            disabled={isExportingExcel}
            className="btn-primary"
            style={{
              padding: '0.45rem 1.15rem',
              fontSize: '0.8125rem',
              minHeight: '36px',
              backgroundColor: 'var(--purple)',
              boxShadow: '0 2px 8px rgba(75, 46, 131, 0.2)',
            }}
            title="Baixar planilha Excel (.xlsx) com linhas quitadas grifadas em amarelo idêntico à conferência"
          >
            {isExportingExcel ? (
              <>
                <span
                  className="animate-spin"
                  style={{
                    width: '13px',
                    height: '13px',
                    borderRadius: '50%',
                    border: '2px solid var(--cream)',
                    borderTopColor: 'transparent',
                    display: 'inline-block',
                  }}
                />
                <span>Gerando Excel...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet size={15} color="var(--yellow)" />
                <span style={{ fontWeight: 600 }}>Baixar Excel (.xlsx) Colorido</span>
                <Download size={13} style={{ opacity: 0.8 }} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
