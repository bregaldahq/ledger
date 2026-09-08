import React, { useMemo, useState } from 'react';
import type { RazaoData, Linha, LinhaLancamento, Lancamento, FiltroStatus } from '../types';
import { formatarMoeda, formatarData } from '../types';
import { Link2, FileQuestion } from 'lucide-react';

interface LedgerTableProps {
  dados: RazaoData;
  filtro: FiltroStatus;
  busca: string;
  selectedLancamentoId: number | null;
  onSelectLancamento: (lancamento: Lancamento) => void;
  onLimparFiltroParaExibirPar?: () => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({
  dados,
  filtro,
  busca,
  selectedLancamentoId,
  onSelectLancamento,
  onLimparFiltroParaExibirPar,
}) => {
  const [focusedLancamentoId, setFocusedLancamentoId] = useState<number | null>(null);

  // Cria um mapa rápido id -> Lancamento
  const mapaLancamentos = useMemo(() => {
    const mapa = new Map<number, Lancamento>();
    for (const l of dados.lancamentos) {
      mapa.set(l.id, l);
    }
    return mapa;
  }, [dados.lancamentos]);

  // Normalização do termo de busca
  const buscaNormalizada = busca.trim().toLowerCase();

  // Função para verificar se um lançamento atende ao filtro e busca
  const matchLancamento = (lanc: Lancamento): boolean => {
    // Filtro de status
    if (filtro !== 'todos' && lanc.status !== filtro) {
      return false;
    }

    // Busca textual
    if (buscaNormalizada) {
      const historicoMatch = (lanc.historico || '').toLowerCase().includes(buscaNormalizada);
      const ctaMatch = (lanc.contrapartida || '').toLowerCase().includes(buscaNormalizada);
      const dataMatch = (lanc.data || '').includes(buscaNormalizada) || formatarData(lanc.data).includes(buscaNormalizada);
      const valorStr = (lanc.valor / 100).toFixed(2).replace('.', ',');
      const valorMatch = valorStr.includes(buscaNormalizada) || (lanc.valor / 100).toString().includes(buscaNormalizada);
      const amarracaoMatch = lanc.amarracao !== null && lanc.amarracao.toString() === buscaNormalizada;

      if (!historicoMatch && !ctaMatch && !dataMatch && !valorMatch && !amarracaoMatch) {
        return false;
      }
    }

    return true;
  };

  // Função para rolar suavemente até o lançamento par e destacar a linha
  const navegarAtePar = (lanc: Lancamento) => {
    if (lanc.par === null) return;
    const parLanc = mapaLancamentos.get(lanc.par);
    if (!parLanc) return;

    // Se o par estiver oculto pelo filtro atual, avisa o pai para resetar o filtro
    const parVisivel = matchLancamento(parLanc);
    if (!parVisivel && onLimparFiltroParaExibirPar) {
      onLimparFiltroParaExibirPar();
    }

    onSelectLancamento(parLanc);
    setFocusedLancamentoId(parLanc.id);

    // Aguarda o próximo ciclo de renderização
    setTimeout(() => {
      const elAlvo = document.querySelector(`[data-lanc-id="${parLanc.id}"]`) as HTMLElement;
      if (elAlvo) {
        const row = elAlvo.closest('tr') as HTMLElement;
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.classList.remove('linha-focada');
          void row.offsetWidth;
          row.classList.add('linha-focada');
          setTimeout(() => {
            row.classList.remove('linha-focada');
          }, 2000);
        }
      }
    }, parVisivel ? 30 : 180);
  };

  // Filtragem das linhas da tabela
  const linhasFiltradas = useMemo(() => {
    const semFiltroAtivo = filtro === 'todos' && !buscaNormalizada;

    return dados.linhas.filter((linha: Linha) => {
      // Linhas estruturais (conta, saldo inicial, total)
      if (linha.tipo !== 'lancamento') {
        // Se houver busca ou filtro específico, oculta cabeçalhos decorativos para não poluir
        return semFiltroAtivo;
      }

      const lDebito = linha.debito !== null ? mapaLancamentos.get(linha.debito) : null;
      const lCredito = linha.credito !== null ? mapaLancamentos.get(linha.credito) : null;

      // Se não encontrou lançamentos associados (caso anômalo), exibe apenas sem filtro
      if (!lDebito && !lCredito) return semFiltroAtivo;

      const debitoOk = lDebito ? matchLancamento(lDebito) : false;
      const creditoOk = lCredito ? matchLancamento(lCredito) : false;

      return debitoOk || creditoOk;
    });
  }, [dados.linhas, mapaLancamentos, filtro, buscaNormalizada]);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-card)',
        boxShadow: '0 2px 10px rgba(42, 33, 64, 0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Container com Rolagem Horizontal Suave para Tabelas Contábeis */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table
          style={{
            width: '100%',
            minWidth: '920px',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.8125rem',
          }}
        >
          {/* Cabeçalho da Tabela Contábil */}
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderBottom: '2px solid var(--border-strong)',
                color: 'var(--ink)',
              }}
            >
              <th
                className="technical-label"
                style={{
                  padding: '0.85rem 1rem',
                  width: '105px',
                  whiteSpace: 'nowrap',
                }}
              >
                Data
              </th>
              <th
                className="technical-label"
                style={{
                  padding: '0.85rem 1rem',
                  minWidth: '280px',
                }}
              >
                Histórico
              </th>
              <th
                className="technical-label"
                style={{
                  padding: '0.85rem 0.75rem',
                  width: '110px',
                  whiteSpace: 'nowrap',
                }}
              >
                Cta.C.Part.
              </th>
              <th
                className="technical-label"
                style={{
                  padding: '0.85rem 1rem',
                  width: '140px',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                Débito (R$)
              </th>
              <th
                className="technical-label"
                style={{
                  padding: '0.85rem 1rem',
                  width: '140px',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                Crédito (R$)
              </th>
              <th
                className="technical-label"
                style={{
                  padding: '0.85rem 1rem',
                  width: '140px',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                Saldo (R$)
              </th>
            </tr>
          </thead>

          {/* Corpo da Tabela */}
          <tbody>
            {linhasFiltradas.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '3.5rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <FileQuestion size={36} color="var(--purple)" style={{ opacity: 0.6 }} />
                    <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--ink)' }}>
                      Nenhum lançamento encontrado
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      Tente alterar os filtros ou o termo de busca no painel acima.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              linhasFiltradas.map((linha: Linha, idx: number) => {
                // 1. Linha de Conta
                if (linha.tipo === 'conta') {
                  return (
                    <tr
                      key={`conta-${idx}`}
                      style={{
                        backgroundColor: 'var(--purple-subtle)',
                        borderTop: '1px solid var(--border-strong)',
                        borderBottom: '1px solid var(--border-strong)',
                      }}
                    >
                      <td
                        colSpan={6}
                        style={{
                          padding: '0.75rem 1rem',
                          fontWeight: 700,
                          color: 'var(--purple)',
                          fontSize: '0.875rem',
                        }}
                      >
                        Conta: {linha.codigo} — {linha.nome}
                      </td>
                    </tr>
                  );
                }

                // 2. Linha de Saldo Anterior
                if (linha.tipo === 'saldo_anterior') {
                  return (
                    <tr
                      key={`saldo-ant-${idx}`}
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        borderBottom: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                      }}
                    >
                      <td style={{ padding: '0.65rem 1rem' }}>—</td>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 500 }}>SALDO ANTERIOR</td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>—</td>
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>—</td>
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>—</td>
                      <td
                        className="font-mono tabular-nums"
                        style={{
                          padding: '0.65rem 1rem',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: 'var(--ink)',
                        }}
                      >
                        {formatarMoeda(linha.saldo)}
                      </td>
                    </tr>
                  );
                }

                // 3. Linha de Totalizadores
                if (linha.tipo === 'total') {
                  return (
                    <tr
                      key={`total-${idx}`}
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        borderTop: '2px solid var(--ink)',
                        borderBottom: '2px solid var(--ink)',
                        fontWeight: 700,
                        color: 'var(--ink)',
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem' }}>TOTAL</td>
                      <td style={{ padding: '0.85rem 1rem' }}>TOTAIS DO PERÍODO</td>
                      <td style={{ padding: '0.85rem 0.75rem' }}>—</td>
                      <td
                        className="font-mono tabular-nums"
                        style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--purple)' }}
                      >
                        {formatarMoeda(linha.debito)}
                      </td>
                      <td
                        className="font-mono tabular-nums"
                        style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--purple)' }}
                      >
                        {formatarMoeda(linha.credito)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>—</td>
                    </tr>
                  );
                }

                // 4. Linha de Lançamento Contábil
                const linhaLanc = linha as LinhaLancamento;
                const lDebito = linhaLanc.debito !== null ? mapaLancamentos.get(linhaLanc.debito) : null;
                const lCredito = linhaLanc.credito !== null ? mapaLancamentos.get(linhaLanc.credito) : null;

                // Determina o status dominante para coloração e destaque
                const lancAtivo = lCredito || lDebito;
                const status = lancAtivo?.status || 'aberto';
                const isConciliado = status === 'conciliado';
                const isAberto = status === 'aberto';
                const isSemPar = status === 'sem_par';

                const isSelected =
                  (lDebito && lDebito.id === selectedLancamentoId) ||
                  (lCredito && lCredito.id === selectedLancamentoId);

                // Configuração visual da linha
                let bgRow = 'transparent';
                let hoverBg = 'rgba(75, 46, 131, 0.03)';
                let borderLeft = '3px solid transparent';

                if (isConciliado) {
                  // Marca-texto Amarelo Suave Bregalda
                  bgRow = 'var(--yellow-subtle)';
                  hoverBg = '#FEF08A';
                  borderLeft = '3px solid var(--yellow)';
                } else if (isAberto) {
                  bgRow = '#FFFDFD';
                  borderLeft = '3px solid var(--red-border)';
                } else if (isSemPar) {
                  bgRow = '#F9FBFF';
                  borderLeft = '3px solid var(--blue-border)';
                }

                if (isSelected) {
                  bgRow = 'color-mix(in srgb, var(--purple-subtle) 70%, var(--yellow-subtle))';
                  borderLeft = '3px solid var(--purple)';
                }

                return (
                  <tr
                    key={`lanc-${idx}`}
                    id={`row-lanc-${lDebito?.id ?? lCredito?.id}`}
                    className={
                      (lDebito?.id === focusedLancamentoId || lCredito?.id === focusedLancamentoId)
                        ? 'linha-focada'
                        : undefined
                    }
                    onClick={() => {
                      if (lancAtivo) {
                        onSelectLancamento(lancAtivo);
                      }
                    }}
                    style={{
                      backgroundColor: bgRow,
                      borderBottom: '1px solid var(--border-subtle)',
                      borderLeft: borderLeft,
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = bgRow;
                    }}
                    title={
                      isConciliado
                        ? `Lançamento quitado (Amarração #${lancAtivo?.amarracao}). Clique no valor para ir até o par.`
                        : isAberto
                        ? 'Duplicata em aberto aguardando pagamento.'
                        : 'Débito lançado sem duplicata correspondente.'
                    }
                  >
                    {/* Coluna Data */}
                    <td
                      className="font-mono tabular-nums"
                      style={{
                        padding: '0.65rem 1rem',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatarData(linhaLanc.data)}
                    </td>

                    {/* Coluna Histórico */}
                    <td
                      style={{
                        padding: '0.65rem 1rem',
                        color: 'var(--ink)',
                        lineHeight: 1.4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span>{linhaLanc.historico}</span>

                        {/* Badges de Destaque por Lançamento */}
                        {isConciliado && lancAtivo && lancAtivo.amarracao !== null && (
                          <button
                            type="button"
                            className="badge badge-conciliado"
                            onClick={(e) => {
                              e.stopPropagation();
                              navegarAtePar(lancAtivo);
                            }}
                            style={{
                              padding: '0.1rem 0.4rem',
                              fontSize: '0.6875rem',
                              gap: '0.2rem',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            title={`Navegar até o par correspondente (#${lancAtivo.amarracao})`}
                          >
                            <Link2 size={10} />
                            #{lancAtivo.amarracao}
                          </button>
                        )}

                        {isAberto && (
                          <span
                            className="badge badge-aberto"
                            style={{
                              padding: '0.1rem 0.4rem',
                              fontSize: '0.6875rem',
                            }}
                          >
                            Aberto
                          </span>
                        )}

                        {isSemPar && (
                          <span
                            className="badge badge-sem-par"
                            style={{
                              padding: '0.1rem 0.4rem',
                              fontSize: '0.6875rem',
                            }}
                          >
                            Sem Par
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Coluna Contrapartida */}
                    <td
                      className="font-mono"
                      style={{
                        padding: '0.65rem 0.75rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {linhaLanc.contrapartida || '—'}
                    </td>

                    {/* Coluna Débito */}
                    <td
                      className="font-mono tabular-nums"
                      style={{
                        padding: '0.65rem 1rem',
                        textAlign: 'right',
                        fontWeight: lDebito ? 600 : 400,
                        color: lDebito
                          ? isConciliado
                            ? '#713F12'
                            : 'var(--blue-lapis)'
                          : 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {lDebito ? (
                        isConciliado && lDebito.par !== null ? (
                          <button
                            type="button"
                            className="btn-valor-par"
                            data-lanc-id={lDebito.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              navegarAtePar(lDebito);
                            }}
                            title={`Clique para ir até a aquisição de mesmo valor (Par #${lDebito.amarracao}${lDebito.dias !== null ? ` · pago em ${lDebito.dias} dias` : ''})`}
                          >
                            <span>{formatarMoeda(lDebito.valor)}</span>
                          </button>
                        ) : (
                          <span data-lanc-id={lDebito.id}>{formatarMoeda(lDebito.valor)}</span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Coluna Crédito */}
                    <td
                      className="font-mono tabular-nums"
                      style={{
                        padding: '0.65rem 1rem',
                        textAlign: 'right',
                        fontWeight: lCredito ? 600 : 400,
                        color: lCredito
                          ? isConciliado
                            ? '#713F12'
                            : 'var(--red-lapis)'
                          : 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {lCredito ? (
                        isConciliado && lCredito.par !== null ? (
                          <button
                            type="button"
                            className="btn-valor-par"
                            data-lanc-id={lCredito.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              navegarAtePar(lCredito);
                            }}
                            title={`Clique para ir até o pagamento de mesmo valor (Par #${lCredito.amarracao}${lCredito.dias !== null ? ` · pago em ${lCredito.dias} dias` : ''})`}
                          >
                            <span>{formatarMoeda(lCredito.valor)}</span>
                          </button>
                        ) : (
                          <span data-lanc-id={lCredito.id}>{formatarMoeda(lCredito.valor)}</span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Coluna Saldo */}
                    <td
                      className="font-mono tabular-nums"
                      style={{
                        padding: '0.65rem 1rem',
                        textAlign: 'right',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                      }}
                    >
                      {formatarMoeda(linhaLanc.saldo)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
