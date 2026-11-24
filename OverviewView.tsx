import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, RotateCcw } from 'lucide-react';
import { ANOS_DISPONIVEIS, DADOS_CONSOLIDADOS, RegistroMensal } from '../data/financasData';
import {
  formatarMoedaCompacta,
  formatarMoedaCompleta,
  formatarPercentual,
  UnidadeMonetaria,
} from '../utils/formatters';

interface OverviewViewProps {
  dadosFiltrados: RegistroMensal[];
  anoSelecionado: number | 'todos';
  onSelecionarAno: (ano: number | 'todos') => void;
  unidade: UnidadeMonetaria;
  onMudarUnidade: (unidade: UnidadeMonetaria) => void;
  onIrParaTabela: () => void;
}

type ModoGraficoPrincipal = 'area' | 'barras' | 'saldo';

export const OverviewView: React.FC<OverviewViewProps> = ({
  dadosFiltrados,
  anoSelecionado,
  onSelecionarAno,
  unidade,
  onMudarUnidade,
  onIrParaTabela,
}) => {
  const [modoGrafico, setModoGrafico] = useState<ModoGraficoPrincipal>('area');

  const kpis = useMemo(() => {
    const totalArrecadado = dadosFiltrados.reduce((acc, r) => acc + r.valor_arrecadado, 0);
    const totalExecutado = dadosFiltrados.reduce((acc, r) => acc + r.valor_executado, 0);
    const saldoTotal = totalArrecadado - totalExecutado;
    const indiceGlobal = totalArrecadado > 0 ? (totalExecutado / totalArrecadado) * 100 : 0;
    const mesesSuperavit = dadosFiltrados.filter((r) => r.saldo_mensal >= 0).length;
    const mesesDeficit = dadosFiltrados.length - mesesSuperavit;
    const mediaMensalArr = dadosFiltrados.length > 0 ? totalArrecadado / dadosFiltrados.length : 0;
    const mediaMensalExec = dadosFiltrados.length > 0 ? totalExecutado / dadosFiltrados.length : 0;

    return {
      totalArrecadado,
      totalExecutado,
      saldoTotal,
      indiceGlobal,
      mesesSuperavit,
      mesesDeficit,
      mediaMensalArr,
      mediaMensalExec,
    };
  }, [dadosFiltrados]);

  const resumoAnual = useMemo(() => {
    return ANOS_DISPONIVEIS.map((ano) => {
      const linhas = DADOS_CONSOLIDADOS.filter((d) => d.ano === ano);
      const arr = linhas.reduce((acc, r) => acc + r.valor_arrecadado, 0);
      const exec = linhas.reduce((acc, r) => acc + r.valor_executado, 0);
      const saldo = arr - exec;
      const indice = arr > 0 ? (exec / arr) * 100 : 0;
      const superavits = linhas.filter((r) => r.saldo_mensal >= 0).length;
      return { ano, arr, exec, saldo, indice, superavits };
    });
  }, []);

  const divisor = unidade === 'bi' ? 1e9 : 1e6;
  const sufixo = unidade === 'bi' ? 'bi' : 'mi';

  const chartData = useMemo(() => {
    return dadosFiltrados.map((d) => ({
      ...d,
      arrecadado_esc: Number((d.valor_arrecadado / divisor).toFixed(3)),
      executado_esc: Number((d.valor_executado / divisor).toFixed(3)),
      saldo_esc: Number((d.saldo_mensal / divisor).toFixed(3)),
      indice_num: Number(d.indice_execucao_pct.toFixed(2)),
    }));
  }, [dadosFiltrados, divisor]);

  const periodoTexto =
    anoSelecionado === 'todos'
      ? 'Jan/2021 a Dez/2025 · 60 competências'
      : `Exercício ${anoSelecionado} · ${dadosFiltrados.length} competências`;

  return (
    <div className="space-y-6">
      {/* Barra de controles do workspace */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Painel de Execução Orçamentária
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {periodoTexto} · Cruzamento mensal entre arrecadação e despesa executada
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro por exercício */}
          <div
            role="group"
            aria-label="Filtrar por exercício"
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => onSelecionarAno('todos')}
              className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                anoSelecionado === 'todos'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Todos
            </button>
            {ANOS_DISPONIVEIS.map((ano) => (
              <button
                key={ano}
                type="button"
                onClick={() => onSelecionarAno(ano)}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium tabular-nums transition-colors ${
                  anoSelecionado === ano
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>

          {/* Seletor de unidade */}
          <div
            role="group"
            aria-label="Unidade monetária"
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => onMudarUnidade('bi')}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                unidade === 'bi'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              R$ Bilhões
            </button>
            <button
              type="button"
              onClick={() => onMudarUnidade('mi')}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                unidade === 'mi'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              R$ Milhões
            </button>
          </div>

          {anoSelecionado !== 'todos' && (
            <button
              type="button"
              onClick={() => onSelecionarAno('todos')}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar filtro
            </button>
          )}
        </div>
      </div>

      {/* Faixa de 4 KPIs principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Arrecadação Acumulada
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
            {formatarMoedaCompacta(kpis.totalArrecadado, unidade)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Média mensal</span>
            <span className="font-mono font-medium text-slate-700 tabular-nums dark:text-slate-300">
              {formatarMoedaCompacta(kpis.mediaMensalArr, unidade)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Execução Orçamentária
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
            {formatarMoedaCompacta(kpis.totalExecutado, unidade)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Média mensal</span>
            <span className="font-mono font-medium text-slate-700 tabular-nums dark:text-slate-300">
              {formatarMoedaCompacta(kpis.mediaMensalExec, unidade)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Saldo Fiscal Líquido</span>
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                kpis.saldoTotal >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {kpis.saldoTotal >= 0 ? (
                <>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Superávit
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  Déficit
                </>
              )}
            </span>
          </div>
          <div
            className={`mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums ${
              kpis.saldoTotal >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatarMoedaCompacta(kpis.saldoTotal, unidade, true)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{kpis.mesesSuperavit} meses superavitários</span>
            <span className="tabular-nums">{kpis.mesesDeficit} em déficit</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Índice de Execução Global</span>
            <span
              className={`font-medium ${
                kpis.indiceGlobal <= 100
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : kpis.indiceGlobal <= 110
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {kpis.indiceGlobal <= 100
                ? 'Equilibrado'
                : kpis.indiceGlobal <= 110
                ? 'Atenção'
                : 'Acima da receita'}
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
            {formatarPercentual(kpis.indiceGlobal)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Meta de equilíbrio</span>
            <span className="font-mono tabular-nums">≤ 100,00%</span>
          </div>
        </div>
      </div>

      {/* Gráfico Principal Interativo */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {modoGrafico === 'saldo'
                ? 'Saldo Mensal (Arrecadado − Executado)'
                : 'Arrecadação vs. Execução Orçamentária'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Valores mensais consolidados em R$ ({unidade === 'bi' ? 'Bilhões' : 'Milhões'}) · Passe o cursor para inspecionar cada competência
            </p>
          </div>

          <div
            role="group"
            aria-label="Modo de visualização do gráfico"
            className="flex items-center gap-1 self-start rounded-lg border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-950"
          >
            <button
              type="button"
              onClick={() => setModoGrafico('area')}
              className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                modoGrafico === 'area'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Área Comparativa
            </button>
            <button
              type="button"
              onClick={() => setModoGrafico('barras')}
              className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                modoGrafico === 'barras'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Barras Agrupadas
            </button>
            <button
              type="button"
              onClick={() => setModoGrafico('saldo')}
              className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                modoGrafico === 'saldo'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Saldo Mensal
            </button>
          </div>
        </div>

        {/* Legenda limpa sem pills */}
        <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
          {modoGrafico === 'saldo' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-emerald-600" />
                <span>Superávit Mensal (Saldo ≥ 0)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-red-600" />
                <span>Déficit Mensal (Saldo &lt; 0)</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-blue-600" />
                <span>Valor Arrecadado (Receita)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-xs bg-slate-900 dark:bg-amber-500" />
                <span>Valor Executado (Despesa Orçamentária)</span>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {modoGrafico === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradArrecadado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gradExecutado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="ano_mes"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  minTickGap={22}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(1)} ${sufixo}`}
                  width={68}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0].payload as RegistroMensal;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {row.mesNome} de {row.ano} · {row.ano_mes}
                        </div>
                        <div className="mt-2 space-y-1 font-mono tabular-nums">
                          <div className="flex items-center justify-between gap-6">
                            <span className="font-sans text-slate-500 dark:text-slate-400">Arrecadado:</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {formatarMoedaCompleta(row.valor_arrecadado)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-6">
                            <span className="font-sans text-slate-500 dark:text-slate-400">Executado:</span>
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                              {formatarMoedaCompleta(row.valor_executado)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-1 dark:border-slate-800">
                            <span className="font-sans text-slate-500 dark:text-slate-400">Saldo:</span>
                            <span
                              className={`font-semibold ${
                                row.saldo_mensal >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {formatarMoedaCompleta(row.saldo_mensal, true)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-6">
                            <span className="font-sans text-slate-500 dark:text-slate-400">Execução:</span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {formatarPercentual(row.indice_execucao_pct)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="arrecadado_esc"
                  name="Arrecadado"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#gradArrecadado)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="executado_esc"
                  name="Executado"
                  stroke="#D97706"
                  strokeWidth={2}
                  fill="url(#gradExecutado)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            ) : modoGrafico === 'barras' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="ano_mes"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  minTickGap={22}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(1)} ${sufixo}`}
                  width={68}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0].payload as RegistroMensal;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {row.mesNome} de {row.ano} · {row.ano_mes}
                        </div>
                        <div className="mt-2 space-y-1 font-mono tabular-nums">
                          <div className="flex justify-between gap-6">
                            <span className="font-sans text-slate-500">Arrecadado:</span>
                            <span className="text-blue-600">{formatarMoedaCompleta(row.valor_arrecadado)}</span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="font-sans text-slate-500">Executado:</span>
                            <span className="text-amber-600">{formatarMoedaCompleta(row.valor_executado)}</span>
                          </div>
                          <div className="flex justify-between gap-6 border-t border-slate-100 pt-1 dark:border-slate-800">
                            <span className="font-sans text-slate-500">Índice:</span>
                            <span>{formatarPercentual(row.indice_execucao_pct)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="arrecadado_esc" name="Arrecadado" fill="#2563EB" radius={[2, 2, 0, 0]} />
                <Bar dataKey="executado_esc" name="Executado" fill="#D97706" radius={[2, 2, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="ano_mes"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  minTickGap={22}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(1)} ${sufixo}`}
                  width={72}
                />
                <ReferenceLine y={0} stroke="#64748B" strokeWidth={1.2} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0].payload as RegistroMensal;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {row.mesNome} de {row.ano} · {row.ano_mes}
                        </div>
                        <div className="mt-2 space-y-1 font-mono tabular-nums">
                          <div className="flex justify-between gap-6">
                            <span className="font-sans text-slate-500">Saldo Mensal:</span>
                            <span className={row.saldo_mensal >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
                              {formatarMoedaCompleta(row.saldo_mensal, true)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="font-sans text-slate-500">Situação:</span>
                            <span className="font-sans font-medium">
                              {row.saldo_mensal >= 0 ? 'Superávit' : 'Déficit'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="saldo_esc" name="Saldo" radius={[2, 2, 2, 2]}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.ano_mes}
                      fill={entry.saldo_mensal >= 0 ? '#16A34A' : '#DC2626'}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>

      {/* Grade secundária de 2 colunas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Índice de Execução (%) */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Índice de Execução Orçamentária (%)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Razão Executado / Arrecadado · Linha tracejada indica teto de 100%
              </p>
            </div>
            <span className="font-mono text-xs font-medium text-slate-500 tabular-nums dark:text-slate-400">
              Pico: 192,88% (2022-10)
            </span>
          </div>

          <div className="mt-4 h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="ano_mes"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  minTickGap={26}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  domain={[60, 200]}
                  width={48}
                />
                <ReferenceLine
                  y={100}
                  stroke="#DC2626"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0].payload as RegistroMensal;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {row.mesNome} de {row.ano}
                        </div>
                        <div className="mt-1.5 font-mono tabular-nums">
                          Índice:{' '}
                          <span
                            className={`font-semibold ${
                              row.indice_execucao_pct <= 100 ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {formatarPercentual(row.indice_execucao_pct)}
                          </span>
                        </div>
                        <div className="mt-1 text-slate-500">
                          {row.indice_execucao_pct > 100
                            ? 'Execução superior à arrecadação mensal'
                            : 'Execução dentro da arrecadação mensal'}
                        </div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="indice_num"
                  stroke="#0F172A"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (typeof cx !== 'number' || typeof cy !== 'number') return <g key={payload?.ano_mes} />;
                    const acima = payload.indice_execucao_pct > 115;
                    return (
                      <circle
                        key={payload.ano_mes}
                        cx={cx}
                        cy={cy}
                        r={acima ? 3.5 : 2}
                        fill={acima ? '#DC2626' : '#2563EB'}
                        strokeWidth={0}
                      />
                    );
                  }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Resumo Comparativo Anual (2021-2025) */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Desempenho Consolidado por Exercício
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Clique em qualquer exercício para filtrar os gráficos e indicadores
              </p>
            </div>
            <button
              type="button"
              onClick={onIrParaTabela}
              className="whitespace-nowrap shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
            >
              Ver 60 meses
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2.5 pr-3 font-medium">Exercício</th>
                  <th className="px-3 py-2.5 text-right font-medium">Arrecadado</th>
                  <th className="px-3 py-2.5 text-right font-medium">Executado</th>
                  <th className="px-3 py-2.5 text-right font-medium">Saldo Anual</th>
                  <th className="py-2.5 pl-3 text-right font-medium">Índice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {resumoAnual.map((item) => {
                  const ativo = anoSelecionado === item.ano;
                  return (
                    <tr
                      key={item.ano}
                      onClick={() =>
                        onSelecionarAno(ativo ? 'todos' : item.ano)
                      }
                      className={`cursor-pointer transition-colors ${
                        ativo
                          ? 'bg-blue-50/70 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-3 pr-3 font-medium text-slate-900 tabular-nums dark:text-slate-100">
                        {item.ano}
                        <span className="ml-2 text-[11px] font-normal text-slate-400">
                          {item.superavits}/12 sup.
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-700 tabular-nums dark:text-slate-300">
                        {formatarMoedaCompacta(item.arr, unidade)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-700 tabular-nums dark:text-slate-300">
                        {formatarMoedaCompacta(item.exec, unidade)}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-mono font-medium tabular-nums ${
                          item.saldo >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatarMoedaCompacta(item.saldo, unidade, true)}
                      </td>
                      <td className="py-3 pl-3 text-right font-mono font-medium text-slate-900 tabular-nums dark:text-slate-100">
                        {formatarPercentual(item.indice)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
