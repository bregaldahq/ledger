import { useState, useEffect, useCallback, useMemo } from 'react';
import type { RazaoData, Lancamento, FiltroStatus, Usuario } from './types';
import { formatarData } from './types';
import { processarPlanilha, exportarExcel, baixarBlob, verificarSaudeApi, SessaoExpiradaError } from './lib/api';
import { obterSessao, logout, onAuthStateChange } from './lib/auth';
import { Navbar } from './components/Navbar';
import { Dropzone } from './components/Dropzone';
import { MetricsStrip } from './components/MetricsStrip';
import { ControlsBar } from './components/ControlsBar';
import { LedgerTable } from './components/LedgerTable';
import { MatchingDrawer } from './components/MatchingDrawer';
import { LoginScreen } from './components/LoginScreen';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function App() {
  // Estado de Dados Contábeis
  const [dados, setDados] = useState<RazaoData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(
    'Conferindo duplicatas a pagar e amarrando créditos e débitos...'
  );
  const [erro, setErro] = useState<string | null>(null);

  // Estado de Filtros e Busca
  const [filtroAtual, setFiltroAtual] = useState<FiltroStatus>('todos');
  const [termoBusca, setTermoBusca] = useState<string>('');

  // Estado da Gaveta de Amarração
  const [selectedLancamento, setSelectedLancamento] = useState<Lancamento | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Estado de Exportação
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // Estado de Autenticação e Sistema (Login Gate Obrigatório)
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLocal, setIsLocal] = useState<boolean>(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [apiOnline, setApiOnline] = useState<boolean>(true);

  // Checagem de Saúde da API
  const checarSaude = useCallback(async () => {
    const online = await verificarSaudeApi();
    setApiOnline(online);
  }, []);

  // Inicialização de Sessão e Listener
  useEffect(() => {
    checarSaude();
    obterSessao()
      .then((sessao) => {
        setUsuario(sessao.usuario);
        setIsLocal(sessao.isLocalDev);
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });

    const unsubscribe = onAuthStateChange((usr, local) => {
      setUsuario(usr);
      setIsLocal(local);
      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [checarSaude]);

  // Handler de Envio de Arquivo para a API
  const handleFileSelected = async (file: File) => {
    setIsLoading(true);
    setErro(null);
    setLoadingMessage('Conferindo duplicatas a pagar e amarrando créditos e débitos...');

    try {
      const resultado = await processarPlanilha(file);
      setDados(resultado);
      setFiltroAtual('todos');
      setTermoBusca('');
      setSelectedLancamento(null);
      setIsDrawerOpen(false);
    } catch (err: unknown) {
      if (err instanceof SessaoExpiradaError) {
        await handleLogout();
        return;
      }
      const mensagem = err instanceof Error ? err.message : 'Falha ao processar a planilha.';
      setErro(mensagem);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler de Reset / Trocar Planilha
  const handleReset = () => {
    setDados(null);
    setErro(null);
    setSelectedLancamento(null);
    setIsDrawerOpen(false);
    setFiltroAtual('todos');
    setTermoBusca('');
  };

  // Handler de Seleção de Lançamento na Tabela (navega sem abrir aba/gaveta)
  const handleSelectLancamento = (lanc: Lancamento) => {
    setSelectedLancamento(lanc);
    // Não abre a gaveta lateral por cima da tela: mantém a usuária na tabela
  };

  // Encontra o Lançamento Par da Amarração
  const parLancamento = useMemo(() => {
    if (!dados || !selectedLancamento || selectedLancamento.par === null) {
      return null;
    }
    return dados.lancamentos.find((l) => l.id === selectedLancamento.par) || null;
  }, [dados, selectedLancamento]);

  // Handler de Logout
  const handleLogout = async () => {
    await logout();
    setUsuario(null);
    setDados(null);
    setSelectedLancamento(null);
  };

  // Handler de Exportação para Excel (.xlsx) Colorido
  const handleExportarExcel = async () => {
    if (!dados) return;
    setIsExportingExcel(true);
    try {
      const blob = await exportarExcel(dados);
      const baseName = dados.arquivo ? dados.arquivo.replace(/\.[^/.]+$/, '') : 'razao_conferido';
      baixarBlob(blob, `${baseName}_conferido.xlsx`);
    } catch (err: unknown) {
      if (err instanceof SessaoExpiradaError) {
        await handleLogout();
        return;
      }
      const msg = err instanceof Error ? err.message : 'Falha ao gerar o arquivo Excel.';
      alert(msg);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Handler de Exportação para CSV (com BOM UTF-8 e separador ;)
  const handleExportarCsv = () => {
    if (!dados) return;

    const mapaLanc = new Map<number, Lancamento>();
    for (const l of dados.lancamentos) {
      mapaLanc.set(l.id, l);
    }

    const cabecalho = [
      'Data',
      'Historico',
      'Contrapartida',
      'Debito',
      'Credito',
      'Saldo',
      'Status',
      'Amarracao',
      'Dias_Ate_Quitacao',
      'Fornecedor_Confirmado',
    ];

    const linhasCsv: string[] = [cabecalho.join(';')];

    for (const linha of dados.linhas) {
      if (linha.tipo === 'lancamento') {
        const lDeb = linha.debito !== null ? mapaLanc.get(linha.debito) : null;
        const lCred = linha.credito !== null ? mapaLanc.get(linha.credito) : null;
        const lanc = lCred || lDeb;

        const statusDesc =
          lanc?.status === 'conciliado'
            ? 'QUITADO'
            : lanc?.status === 'aberto'
            ? 'EM ABERTO'
            : lanc?.status === 'sem_par'
            ? 'SEM PAR'
            : '';

        const debStr = lDeb ? (lDeb.valor / 100).toFixed(2).replace('.', ',') : '';
        const credStr = lCred ? (lCred.valor / 100).toFixed(2).replace('.', ',') : '';
        const saldoStr = linha.saldo !== null ? (linha.saldo / 100).toFixed(2).replace('.', ',') : '';
        const amarracaoStr =
          lanc?.amarracao !== null && lanc?.amarracao !== undefined ? lanc.amarracao.toString() : '';
        const diasStr = lanc?.dias !== null && lanc?.dias !== undefined ? lanc.dias.toString() : '';
        const corrobStr =
          lanc?.corroborado === true ? 'SIM' : lanc?.corroborado === false ? 'VALE_CONFERIR' : '';

        linhasCsv.push(
          [
            linha.data || '',
            `"${(linha.historico || '').replace(/"/g, '""')}"`,
            `"${(linha.contrapartida || '').replace(/"/g, '""')}"`,
            debStr,
            credStr,
            saldoStr,
            statusDesc,
            amarracaoStr,
            diasStr,
            corrobStr,
          ].join(';')
        );
      }
    }

    const csvContent = '\uFEFF' + linhasCsv.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const baseName = dados.arquivo ? dados.arquivo.replace(/\.[^/.]+$/, '') : 'razao_conferido';
    baixarBlob(blob, `${baseName}_conferido.csv`);
  };

  // Contagem de Lançamentos Filtrados
  const contagemLancamentosFiltrados = useMemo(() => {
    if (!dados) return 0;
    const buscaNorm = termoBusca.trim().toLowerCase();

    return dados.lancamentos.filter((lanc) => {
      if (filtroAtual !== 'todos' && lanc.status !== filtroAtual) {
        return false;
      }
      if (buscaNorm) {
        const hMatch = (lanc.historico || '').toLowerCase().includes(buscaNorm);
        const cMatch = (lanc.contrapartida || '').toLowerCase().includes(buscaNorm);
        const dMatch = (lanc.data || '').includes(buscaNorm) || formatarData(lanc.data).includes(buscaNorm);
        const valStr = (lanc.valor / 100).toFixed(2).replace('.', ',');
        const vMatch = valStr.includes(buscaNorm) || (lanc.valor / 100).toString().includes(buscaNorm);
        const aMatch = lanc.amarracao !== null && lanc.amarracao.toString() === buscaNorm;
        if (!hMatch && !cMatch && !dMatch && !vMatch && !aMatch) return false;
      }
      return true;
    }).length;
  }, [dados, filtroAtual, termoBusca]);

  // 1. Verificação de Sessão Inicial
  if (isCheckingAuth) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--cream)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.85rem',
        }}
      >
        <Loader2 size={30} className="animate-spin" color="var(--purple)" />
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
          }}
        >
          Verificando permissões de acesso...
        </span>
      </div>
    );
  }

  // 2. Barreira de Autenticação Obrigatória (Login Gate)
  if (!usuario) {
    return (
      <LoginScreen
        isLocalDev={isLocal}
        onLoginSuccess={(usr) => {
          setUsuario(usr);
        }}
      />
    );
  }

  // 3. Aplicação Liberada para Usuário Autenticado e Autorizado
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Barra Superior de Navegação */}
      <Navbar
        apiOnline={apiOnline}
        hasData={Boolean(dados)}
        onReset={handleReset}
        usuario={usuario}
        isLocal={isLocal}
        onLogout={handleLogout}
        onCheckHealth={checarSaude}
      />

      {/* 2. Conteúdo Principal da Aplicação */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          padding: 'var(--space-4) var(--page-gutter)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!dados ? (
          /* Estado Inicial: Área de Drag & Drop Convidativa */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 'calc(100vh - var(--nav-height) - 100px)',
            }}
          >
            <Dropzone
              onFileSelected={handleFileSelected}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              error={erro}
              onClearError={() => setErro(null)}
            />
          </div>
        ) : (
          /* Estado com Planilha Carregada: Análise Contábil Completa */
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Faixa de Métricas e Cabeçalho */}
            <MetricsStrip dados={dados} />

            {/* Barra de Controles, Filtros e Exportação */}
            <ControlsBar
              filtroAtual={filtroAtual}
              onSelectFiltro={setFiltroAtual}
              termoBusca={termoBusca}
              onBuscaChange={setTermoBusca}
              onExportarExcel={handleExportarExcel}
              isExportingExcel={isExportingExcel}
              onExportarCsv={handleExportarCsv}
              totalLancamentos={dados.lancamentos.length}
              lancamentosFiltrados={contagemLancamentosFiltrados}
              contagemQuitados={dados.resumo.quitados.qtd}
              contagemAbertos={dados.resumo.abertos.qtd}
              contagemSemPar={dados.resumo.sem_par.qtd}
            />

            {/* Tabela do Razão Contábil com Realces */}
            <LedgerTable
              dados={dados}
              filtro={filtroAtual}
              busca={termoBusca}
              selectedLancamentoId={selectedLancamento?.id || null}
              onSelectLancamento={handleSelectLancamento}
              onLimparFiltroParaExibirPar={() => setFiltroAtual('todos')}
            />
          </div>
        )}
      </main>

      {/* 3. Rodapé Editorial Bregalda */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '1.25rem var(--page-gutter)',
          backgroundColor: 'var(--cream)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img
            src="/brand/icone_bregalda.svg"
            alt="Bregalda"
            style={{ width: '18px', height: '18px', borderRadius: '3px' }}
          />
          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Bregalda</span>
          <span>· Ferramentas ponderadas para problemas técnicos reais.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={14} color="var(--green)" />
          <span className="font-mono">Zero-Storage: Processamento 100% efêmero em memória.</span>
        </div>
      </footer>

      {/* 4. Gaveta Lateral de Amarração 1:1 */}
      <MatchingDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        lancamento={selectedLancamento}
        parLancamento={parLancamento}
      />
    </div>
  );
}
