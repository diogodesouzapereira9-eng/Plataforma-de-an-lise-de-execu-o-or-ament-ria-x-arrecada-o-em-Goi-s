import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search, X } from 'lucide-react';
import {
  ANOS_DISPONIVEIS,
  calcularModeloOLS,
  DADOS_CONSOLIDADOS,
  RegistroMensal,
} from '../data/financasData';
import {
  exportarParaCSV,
  formatarMoedaCompacta,
  formatarMoedaCompleta,
  formatarPercentual,
} from '../utils/formatters';

interface ConsolidatedTableViewProps {
  anoSelecionado: number | 'todos';
  onSelecionarAno: (ano: number | 'todos') => void;
}

type ColunaOrdenacao =
  | 'ano_mes'
  | 'valor_arrecadado'
  | 'valor_executado'
  | 'saldo_mensal'
  | 'indice_execucao_pct';

type FiltroSituacao = 'todos' | 'superavit' | 'deficit';

export const ConsolidatedTableView: React.FC<ConsolidatedTableViewProps> = ({
  anoSelecionado,
  onSelecionarAno,
}) => {
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<FiltroSituacao>('todos');
  const [ordenarPor, setOrdenarPor] = useState<ColunaOrdenacao>('ano_mes');
  const [direcao, setDirecao] = useState<'asc' | 'desc'>('asc');
  const [mesInspecionado, setMesInspecionado] = useState<string | null>('2022-10');

  const modeloCompleto = useMemo(() => calcularModeloOLS(DADOS_CONSOLIDADOS), []);

  const mapaOLS = useMemo(() => {
    const mapa = new Map<string, { valor_ajustado: number; residuo: number }>();
    for (const p of modeloCompleto.pontos) {
      mapa.set(p.ano_mes, {
        valor_ajustado: p.valor_ajustado,
        residuo: p.residuo,
      });
    }
    return mapa;
  }, [modeloCompleto]);

  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtradas = DADOS_CONSOLIDADOS.filter((item) => {
      if (anoSelecionado !== 'todos' && item.ano !== anoSelecionado) return false;
      if (situacao === 'superavit' && item.saldo_mensal < 0) return false;
      if (situacao === 'deficit' && item.saldo_mensal >= 0) return false;
      if (termo) {
        const alvo = `${item.ano_mes} ${item.mesNome.toLowerCase()} ${item.ano}`;
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });

    return [...filtradas].sort((a, b) => {
      const valA = a[ordenarPor];
      const valB = b[ordenarPor];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return direcao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return direcao === 'asc'
        ? Number(valA) - Number(valB)
        : Number(valB) - Number(valA);
    });
  }, [anoSelecionado, situacao, busca, ordenarPor, direcao]);

  const alternarOrdenacao = (col: ColunaOrdenacao) => {
    if (ordenarPor === col) {
      setDirecao((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrdenarPor(col);
      setDirecao(col === 'ano_mes' ? 'asc' : 'desc');
    }
  };

  const limparFiltros = () => {
    setBusca('');
    setSituacao('todos');
    onSelecionarAno('todos');
  };

  const registroSelecionado = useMemo(() => {
    if (!mesInspecionado) return null;
    return DADOS_CONSOLIDADOS.find((d) => d.ano_mes === mesInspecionado) || null;
  }, [mesInspecionado]);

  const renderSortIcon = (col: ColunaOrdenacao) => {
    if (ordenarPor !== col) {
      return <ArrowUpDown className="ml-1 inline h-3 w-3 text-slate-400" />;
    }
    return direcao === 'asc' ? (
      <ArrowUp className="ml-1 inline h-3 w-3 text-blue-600" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3 text-blue-600" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Base Consolidada · tb_analise_consolidada
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {linhasFiltradas.length} de {DADOS_CONSOLIDADOS.length} competências exibidas · Valores em R$ reais e índice percentual
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportarParaCSV(linhasFiltradas)}
          disabled={linhasFiltradas.length === 0}
          className="inline-flex items-center gap-2 self-start whitespace-nowrap shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar seleção ({linhasFiltradas.length})
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar competência (ex: 2024-10, Dezembro)..."
            aria-label="Buscar competência"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-8 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro ano */}
          <div
            role="group"
            aria-label="Filtrar por exercício"
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-950"
          >
            <button
              type="button"
              onClick={() => onSelecionarAno('todos')}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                anoSelecionado === 'todos'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Todos
            </button>
            {ANOS_DISPONIVEIS.map((ano) => (
              <button
                key={ano}
                type="button"
                onClick={() => onSelecionarAno(ano)}
                className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${
                  anoSelecionado === ano
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>

          {/* Filtro situação fiscal */}
          <div
            role="group"
            aria-label="Filtrar por resultado fiscal"
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-950"
          >
            <button
              type="button"
              onClick={() => setSituacao('todos')}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                situacao === 'todos'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setSituacao('superavit')}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                situacao === 'superavit'
                  ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-800 dark:text-emerald-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Superávit
            </button>
            <button
              type="button"
              onClick={() => setSituacao('deficit')}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                situacao === 'deficit'
                  ? 'bg-white text-red-700 shadow-xs dark:bg-slate-800 dark:text-red-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Déficit
            </button>
          </div>
        </div>
      </div>

      {/* Painel de inspeção da competência selecionada */}
      {registroSelecionado && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Inspeção detalhada ·{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {registroSelecionado.mesNome} de {registroSelecionado.ano} ({registroSelecionado.ano_mes})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMesInspecionado(null)}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Fechar detalhe
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Arrecadado (X)</div>
              <div className="mt-1 font-mono text-xs font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                {formatarMoedaCompleta(registroSelecionado.valor_arrecadado)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Executado Real (Y)</div>
              <div className="mt-1 font-mono text-xs font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                {formatarMoedaCompleta(registroSelecionado.valor_executado)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Saldo Mensal</div>
              <div
                className={`mt-1 font-mono text-xs font-semibold tabular-nums ${
                  registroSelecionado.saldo_mensal >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatarMoedaCompleta(registroSelecionado.saldo_mensal, true)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Índice de Execução</div>
              <div className="mt-1 font-mono text-xs font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                {formatarPercentual(registroSelecionado.indice_execucao_pct)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Previsto OLS (Ŷ)</div>
              <div className="mt-1 font-mono text-xs font-semibold text-blue-600 tabular-nums dark:text-blue-400">
                {formatarMoedaCompacta(mapaOLS.get(registroSelecionado.ano_mes)?.valor_ajustado || 0, 'bi')}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Resíduo (Y − Ŷ)</div>
              <div className="mt-1 font-mono text-xs font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                {formatarMoedaCompacta(mapaOLS.get(registroSelecionado.ano_mes)?.residuo || 0, 'mi', true)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tabela Analítica */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {linhasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Nenhuma competência encontrada para os filtros aplicados
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Ajuste o termo de busca, o exercício ou o filtro de resultado fiscal.
            </p>
            <button
              type="button"
              onClick={limparFiltros}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  <th className="py-3 pr-3 pl-5 font-medium">
                    <button
                      type="button"
                      onClick={() => alternarOrdenacao('ano_mes')}
                      className="inline-flex items-center whitespace-nowrap hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Competência {renderSortIcon('ano_mes')}
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Mês</th>
                  <th className="px-3 py-3 text-right font-medium">
                    <button
                      type="button"
                      onClick={() => alternarOrdenacao('valor_arrecadado')}
                      className="inline-flex items-center whitespace-nowrap hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Valor Arrecadado {renderSortIcon('valor_arrecadado')}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    <button
                      type="button"
                      onClick={() => alternarOrdenacao('valor_executado')}
                      className="inline-flex items-center whitespace-nowrap hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Valor Executado {renderSortIcon('valor_executado')}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    <button
                      type="button"
                      onClick={() => alternarOrdenacao('saldo_mensal')}
                      className="inline-flex items-center whitespace-nowrap hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Saldo Mensal {renderSortIcon('saldo_mensal')}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    <button
                      type="button"
                      onClick={() => alternarOrdenacao('indice_execucao_pct')}
                      className="inline-flex items-center whitespace-nowrap hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Índice (%) {renderSortIcon('indice_execucao_pct')}
                    </button>
                  </th>
                  <th className="py-3 pr-5 pl-3 text-right font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {linhasFiltradas.map((item: RegistroMensal) => {
                  const selecionado = mesInspecionado === item.ano_mes;
                  const superavit = item.saldo_mensal >= 0;
                  return (
                    <tr
                      key={item.ano_mes}
                      onClick={() => setMesInspecionado(item.ano_mes)}
                      className={`h-10 cursor-pointer transition-colors ${
                        selecionado
                          ? 'bg-blue-50/70 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 pr-3 pl-5 font-mono font-medium text-slate-900 tabular-nums dark:text-slate-100">
                        {item.ano_mes}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                        {item.mesNome}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700 tabular-nums dark:text-slate-300">
                        {formatarMoedaCompleta(item.valor_arrecadado)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700 tabular-nums dark:text-slate-300">
                        {formatarMoedaCompleta(item.valor_executado)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono font-medium tabular-nums ${
                          superavit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatarMoedaCompleta(item.saldo_mensal, true)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-900 tabular-nums dark:text-slate-100">
                        {formatarPercentual(item.indice_execucao_pct)}
                      </td>
                      <td
                        className={`py-2.5 pr-5 pl-3 text-right font-medium ${
                          superavit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {superavit ? 'Superávit' : 'Déficit'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
