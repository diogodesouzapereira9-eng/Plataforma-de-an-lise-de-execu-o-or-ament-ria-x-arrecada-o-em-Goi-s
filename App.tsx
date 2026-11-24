import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Database,
  Download,
  LayoutDashboard,
  Menu,
  Moon,
  ScatterChart as ScatterIcon,
  Sun,
  Table2,
  X,
} from 'lucide-react';
import { ConsolidatedTableView } from './components/ConsolidatedTableView';
import { EconometricView } from './components/EconometricView';
import { OverviewView } from './components/OverviewView';
import { PipelineSQLiteView } from './components/PipelineSQLiteView';
import { TimeSeriesView } from './components/TimeSeriesView';
import { DADOS_CONSOLIDADOS } from './data/financasData';
import { exportarParaCSV, UnidadeMonetaria } from './utils/formatters';

type AbaAtiva = 'visao-geral' | 'serie-temporal' | 'econometria' | 'tabela' | 'pipeline';

interface NavItem {
  id: AbaAtiva;
  label: string;
  breadcrumb: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    breadcrumb: 'Visão Geral',
    icon: LayoutDashboard,
  },
  {
    id: 'serie-temporal',
    label: 'Série & Sazonalidade',
    breadcrumb: 'Série Temporal & Sazonalidade',
    icon: BarChart3,
  },
  {
    id: 'econometria',
    label: 'Modelo Econométrico',
    breadcrumb: 'Modelo OLS & Pearson',
    icon: ScatterIcon,
  },
  {
    id: 'tabela',
    label: 'Base Consolidada',
    breadcrumb: 'Tabela Consolidada (60 meses)',
    icon: Table2,
  },
  {
    id: 'pipeline',
    label: 'Pipeline & SQLite',
    breadcrumb: 'Auditoria SQLite & ETL',
    icon: Database,
  },
];

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('visao-geral');
  const [anoSelecionado, setAnoSelecionado] = useState<number | 'todos'>('todos');
  const [unidade, setUnidade] = useState<UnidadeMonetaria>('bi');
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [modoEscuro, setModoEscuro] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (modoEscuro) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [modoEscuro]);

  const dadosFiltrados = useMemo(() => {
    if (anoSelecionado === 'todos') return DADOS_CONSOLIDADOS;
    return DADOS_CONSOLIDADOS.filter((d) => d.ano === anoSelecionado);
  }, [anoSelecionado]);

  const itemAtual = NAV_ITEMS.find((n) => n.id === abaAtiva) || NAV_ITEMS[0];

  const handleNavegar = (id: AbaAtiva) => {
    setAbaAtiva(id);
    setMenuMobileAberto(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        {/* Overlay Mobile */}
        {menuMobileAberto && (
          <div
            onClick={() => setMenuMobileAberto(false)}
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
            aria-hidden="true"
          />
        )}

        {/* Sidebar de Navegação (256px) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${
            menuMobileAberto ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Marca */}
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-slate-800">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                handleNavegar('visao-geral');
              }}
              className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 dark:text-slate-100"
            >
              FinançasGov
            </a>
            <button
              type="button"
              onClick={() => setMenuMobileAberto(false)}
              aria-label="Fechar menu"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Links de Navegação */}
          <nav aria-label="Navegação principal" className="flex-1 space-y-1 px-3 py-5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const ativo = abaAtiva === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavegar(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap transition-colors ${
                    ativo
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Rodapé da Sidebar */}
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="font-medium text-slate-700 dark:text-slate-300">
                Base Orçamentária
              </div>
              <div className="mt-0.5 font-mono tabular-nums">
                2021-01 a 2025-12 · 60 meses
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModoEscuro((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span className="whitespace-nowrap">
                {modoEscuro ? 'Tema Claro' : 'Tema Escuro'}
              </span>
              {modoEscuro ? (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-500" />
              )}
            </button>
          </div>
        </aside>

        {/* Área Principal */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Bar */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/95">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuMobileAberto(true)}
                aria-label="Abrir menu"
                className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm">
                <span className="hidden text-slate-400 sm:inline whitespace-nowrap">
                  Finanças Públicas
                </span>
                <span className="hidden text-slate-300 sm:inline dark:text-slate-700" aria-hidden="true">
                  /
                </span>
                <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                  {itemAtual.breadcrumb}
                </span>
                {anoSelecionado !== 'todos' && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                      /
                    </span>
                    <span className="font-mono text-xs font-medium text-blue-600 tabular-nums whitespace-nowrap dark:text-blue-400">
                      {anoSelecionado}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() =>
                  exportarParaCSV(
                    dadosFiltrados,
                    anoSelecionado === 'todos'
                      ? 'tb_analise_consolidada_2021_2025.csv'
                      : `tb_analise_consolidada_${anoSelecionado}.csv`
                  )
                }
                className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </button>
            </div>
          </header>

          {/* Conteúdo Principal */}
          <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8">
            {abaAtiva === 'visao-geral' && (
              <OverviewView
                dadosFiltrados={dadosFiltrados}
                anoSelecionado={anoSelecionado}
                onSelecionarAno={setAnoSelecionado}
                unidade={unidade}
                onMudarUnidade={setUnidade}
                onIrParaTabela={() => setAbaAtiva('tabela')}
              />
            )}

            {abaAtiva === 'serie-temporal' && (
              <TimeSeriesView
                unidade={unidade}
                onMudarUnidade={setUnidade}
              />
            )}

            {abaAtiva === 'econometria' && (
              <EconometricView
                dadosFiltrados={dadosFiltrados}
                anoSelecionado={anoSelecionado}
                onSelecionarAno={setAnoSelecionado}
              />
            )}

            {abaAtiva === 'tabela' && (
              <ConsolidatedTableView
                anoSelecionado={anoSelecionado}
                onSelecionarAno={setAnoSelecionado}
              />
            )}

            {abaAtiva === 'pipeline' && <PipelineSQLiteView />}
          </main>
        </div>
      </div>
    </div>
  );
}
