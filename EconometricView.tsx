import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { RotateCcw } from 'lucide-react';
import {
  ANOS_DISPONIVEIS,
  calcularModeloOLS,
  DADOS_CONSOLIDADOS,
  NOTEBOOK_OLS_BASELINE,
  RegistroMensal,
} from '../data/financasData';
import {
  formatarMoedaCompacta,
  formatarMoedaCompleta,
  formatarPercentual,
  formatarPValor,
} from '../utils/formatters';

interface EconometricViewProps {
  dadosFiltrados: RegistroMensal[];
  anoSelecionado: number | 'todos';
  onSelecionarAno: (ano: number | 'todos') => void;
}

const CORES_ANO: Record<number, string> = {
  2021: '#64748B',
  2022: '#D97706',
  2023: '#059669',
  2024: '#2563EB',
  2025: '#0F172A',
};

export const EconometricView: React.FC<EconometricViewProps> = ({
  dadosFiltrados,
  anoSelecionado,
  onSelecionarAno,
}) => {
  // Simulador interativo em R$ Bilhões
  const [arrecadacaoSimuladaBi, setArrecadacaoSimuladaBi] = useState<number>(3.0);

  const modelo = useMemo(() => calcularModeloOLS(dadosFiltrados), [dadosFiltrados]);

  const isBaseline = anoSelecionado === 'todos';

  const dispersaoPorAno = useMemo(() => {
    const grupos: Record<number, Array<{
      x: number;
      y: number;
      yHat: number;
      residuo: number;
      ano_mes: string;
      mesNome: string;
      ano: number;
      valor_arrecadado: number;
      valor_executado: number;
      valor_ajustado: number;
    }>> = {};

    for (const p of modelo.pontos) {
      if (!grupos[p.ano]) grupos[p.ano] = [];
      grupos[p.ano].push({
        x: Number((p.valor_arrecadado / 1e9).toFixed(4)),
        y: Number((p.valor_executado / 1e9).toFixed(4)),
        yHat: Number((p.valor_ajustado / 1e9).toFixed(4)),
        residuo: Number((p.residuo / 1e9).toFixed(4)),
        ano_mes: p.ano_mes,
        mesNome: p.mesNome,
        ano: p.ano,
        valor_arrecadado: p.valor_arrecadado,
        valor_executado: p.valor_executado,
        valor_ajustado: p.valor_ajustado,
      });
    }
    return grupos;
  }, [modelo]);

  const linhaRegressao = useMemo(() => {
    if (modelo.pontos.length < 2) return [];
    const xs = modelo.pontos.map((p) => p.valor_arrecadado);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const yMin = modelo.beta0 + modelo.beta1 * minX;
    const yMax = modelo.beta0 + modelo.beta1 * maxX;

    return [
      { x: Number((minX / 1e9).toFixed(4)), y: Number((yMin / 1e9).toFixed(4)) },
      { x: Number((maxX / 1e9).toFixed(4)), y: Number((yMax / 1e9).toFixed(4)) },
    ];
  }, [modelo]);

  const residuosPorAno = useMemo(() => {
    const grupos: Record<number, Array<{
      x: number;
      y: number;
      ano_mes: string;
      mesNome: string;
      ano: number;
      valor_ajustado: number;
      residuo: number;
    }>> = {};

    for (const p of modelo.pontos) {
      if (!grupos[p.ano]) grupos[p.ano] = [];
      grupos[p.ano].push({
        x: Number((p.valor_ajustado / 1e9).toFixed(4)),
        y: Number((p.residuo / 1e9).toFixed(4)),
        ano_mes: p.ano_mes,
        mesNome: p.mesNome,
        ano: p.ano,
        valor_ajustado: p.valor_ajustado,
        residuo: p.residuo,
      });
    }
    return grupos;
  }, [modelo]);

  const simulacao = useMemo(() => {
    const xReais = arrecadacaoSimuladaBi * 1e9;
    const yEstimado = modelo.beta0 + modelo.beta1 * xReais;
    const saldoProjetado = xReais - yEstimado;
    const indiceProjetado = xReais > 0 ? (yEstimado / xReais) * 100 : 0;
    return { xReais, yEstimado, saldoProjetado, indiceProjetado };
  }, [arrecadacaoSimuladaBi, modelo]);

  const baselineComparativo = useMemo(() => {
    if (isBaseline) return null;
    return calcularModeloOLS(DADOS_CONSOLIDADOS);
  }, [isBaseline]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho e filtro de amostra */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Modelo Econométrico — Correlação de Pearson & OLS
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Regressão Linear Simples entre Arrecadação (X) e Execução Orçamentária (Y) · {modelo.n} observações mensais
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Selecionar amostra para OLS"
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
              Série Completa (60m)
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

          {!isBaseline && (
            <button
              type="button"
              onClick={() => onSelecionarAno('todos')}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar 60 meses
            </button>
          )}
        </div>
      </div>

      {/* 4 Indicadores Estatísticos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Correlação de Pearson (r)</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {Math.abs(modelo.pearsonR) >= 0.7
                ? 'Forte'
                : Math.abs(modelo.pearsonR) >= 0.4
                ? 'Moderada'
                : 'Fraca'}
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums dark:text-slate-100">
            {modelo.pearsonR.toFixed(4).replace('.', ',')}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>p-valor (Correlação)</span>
            <span className="font-mono font-medium text-slate-700 tabular-nums dark:text-slate-300">
              {formatarPValor(modelo.pValueCorr)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Determinação (R²)</span>
            <span className="font-mono text-slate-600 tabular-nums dark:text-slate-300">
              Adj: {(modelo.adjRSquared * 100).toFixed(1).replace('.', ',')}%
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums dark:text-slate-100">
            {formatarPercentual(modelo.rSquared * 100)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Variância explicada por X</span>
            <span className="font-mono font-medium text-slate-700 tabular-nums dark:text-slate-300">
              F = {modelo.fStatistic.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Coeficiente Angular (β₁)</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {modelo.pValueBeta1 < 0.05 ? 'Significante (p < 0,05)' : 'Não signif.'}
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums dark:text-slate-100">
            {modelo.beta1.toFixed(6).replace('.', ',')}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Elasticidade marginal</span>
            <span className="font-mono font-medium text-slate-700 tabular-nums dark:text-slate-300">
              t = {modelo.tStatBeta1.toFixed(3).replace('.', ',')}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Intercepto (β₀)</span>
            <span className="font-mono text-slate-500 tabular-nums">
              DW: {modelo.durbinWatson.toFixed(3).replace('.', ',')}
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums dark:text-slate-100">
            {formatarMoedaCompacta(modelo.beta0, 'mi')}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Observações analisadas</span>
            <span className="font-mono font-medium text-slate-700 tabular-nums dark:text-slate-300">
              n = {modelo.n} meses
            </span>
          </div>
        </div>
      </div>

      {/* Equação Estimada + Simulador Interativo */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Equação da Regressão Linear Simples (OLS)
            </div>
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-medium text-slate-900 tabular-nums dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              Y_estimado = {formatarMoedaCompleta(modelo.beta0)} + ({modelo.beta1.toFixed(6)}) × X
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Para cada <span className="font-medium text-slate-900 dark:text-slate-200">R$ 1,00</span> adicional arrecadado no mês, o modelo estima um acréscimo de{' '}
              <span className="font-mono font-medium text-slate-900 tabular-nums dark:text-slate-200">
                R$ {modelo.beta1.toFixed(2).replace('.', ',')}
              </span>{' '}
              na execução orçamentária mensal.
              {baselineComparativo && (
                <span className="ml-1 text-slate-500">
                  (Na série completa 2021–2025: β₁ = 0,894780 · R² = 30,28%)
                </span>
              )}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-5 lg:col-span-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label
                htmlFor="simulador-arrecadacao"
                className="text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                Simulador de Previsão Orçamentária (X → Ŷ)
              </label>
              <span className="font-mono text-sm font-semibold text-blue-600 tabular-nums dark:text-blue-400">
                X = {formatarMoedaCompacta(simulacao.xReais, 'bi')}
              </span>
            </div>

            <input
              id="simulador-arrecadacao"
              type="range"
              min={2.0}
              max={4.5}
              step={0.05}
              value={arrecadacaoSimuladaBi}
              onChange={(e) => setArrecadacaoSimuladaBi(parseFloat(e.target.value))}
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600 dark:bg-slate-800"
            />

            <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400 tabular-nums">
              <span>R$ 2,00 bi</span>
              <span>R$ 3,25 bi</span>
              <span>R$ 4,50 bi</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Execução Estimada (Ŷ)</div>
                <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                  {formatarMoedaCompacta(simulacao.yEstimado, 'bi')}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Saldo Projetado</div>
                <div
                  className={`mt-0.5 font-mono text-sm font-semibold tabular-nums ${
                    simulacao.saldoProjetado >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatarMoedaCompacta(simulacao.saldoProjetado, 'mi', true)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Índice Previsto</div>
                <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                  {formatarPercentual(simulacao.indiceProjetado)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dois Gráficos do Modelo: Dispersão + Homocedasticidade */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gráfico 1: Dispersão com Reta OLS */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Dispersão com Reta de Regressão OLS
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Arrecadação (X) vs. Execução Orçamentária (Y) em R$ Bilhões · Ajuste R² = {(modelo.rSquared * 100).toFixed(2).replace('.', ',')}%
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            {ANOS_DISPONIVEIS.filter((a) => dispersaoPorAno[a]?.length).map((ano) => (
              <div key={ano} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CORES_ANO[ano] }}
                />
                <span className="tabular-nums">{ano}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 bg-red-600" />
              <span>Reta OLS</span>
            </div>
          </div>

          <div className="mt-3 h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 16, left: 4, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Arrecadação (X)"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  tickFormatter={(v) => `${Number(v).toFixed(1)} bi`}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Execução (Y)"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${Number(v).toFixed(1)} bi`}
                  width={56}
                />
                <ZAxis range={[45, 45]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const p = payload[0].payload;
                    if (!p.ano_mes) return null;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {p.mesNome} de {p.ano} · {p.ano_mes}
                        </div>
                        <div className="mt-2 space-y-1 font-mono tabular-nums">
                          <div className="flex justify-between gap-5">
                            <span className="font-sans text-slate-500">Arrecadação (X):</span>
                            <span className="text-blue-600">{formatarMoedaCompleta(p.valor_arrecadado)}</span>
                          </div>
                          <div className="flex justify-between gap-5">
                            <span className="font-sans text-slate-500">Execução Real (Y):</span>
                            <span>{formatarMoedaCompleta(p.valor_executado)}</span>
                          </div>
                          <div className="flex justify-between gap-5">
                            <span className="font-sans text-slate-500">Ajustado OLS (Ŷ):</span>
                            <span>{formatarMoedaCompleta(p.valor_ajustado)}</span>
                          </div>
                          <div className="flex justify-between gap-5 border-t border-slate-100 pt-1 dark:border-slate-800">
                            <span className="font-sans text-slate-500">Resíduo (Y − Ŷ):</span>
                            <span className={p.residuo >= 0 ? 'text-amber-600' : 'text-emerald-600'}>
                              {formatarMoedaCompacta(p.residuo * 1e9, 'mi', true)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                {ANOS_DISPONIVEIS.filter((a) => dispersaoPorAno[a]?.length).map((ano) => (
                  <Scatter
                    key={ano}
                    name={String(ano)}
                    data={dispersaoPorAno[ano]}
                    fill={CORES_ANO[ano]}
                    fillOpacity={0.82}
                  />
                ))}
                {linhaRegressao.length === 2 && (
                  <Scatter
                    name="Ajuste OLS"
                    data={linhaRegressao}
                    line={{ stroke: '#DC2626', strokeWidth: 2 }}
                    shape={() => <g />}
                    legendType="none"
                  />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Gráfico 2: Diagnóstico de Homocedasticidade */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Diagnóstico de Homocedasticidade (Resíduos vs. Ŷ)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Dispersão dos resíduos (Y − Ŷ) em torno de zero · Outliers positivos indicam execução acima do previsto
            </p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
            {ANOS_DISPONIVEIS.filter((a) => residuosPorAno[a]?.length).map((ano) => (
              <div key={ano} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CORES_ANO[ano] }}
                />
                <span className="tabular-nums">{ano}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 border-t border-dashed border-red-600" />
              <span>Resíduo = 0</span>
            </div>
          </div>

          <div className="mt-3 h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 16, left: 4, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Valores Ajustados (Ŷ)"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  tickFormatter={(v) => `${Number(v).toFixed(1)} bi`}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Resíduo (Y - Ŷ)"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${Number(v).toFixed(1)} bi`}
                  width={60}
                />
                <ZAxis range={[45, 45]} />
                <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="4 4" strokeWidth={1.5} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const p = payload[0].payload;
                    if (!p.ano_mes) return null;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {p.mesNome} de {p.ano} · {p.ano_mes}
                        </div>
                        <div className="mt-2 space-y-1 font-mono tabular-nums">
                          <div className="flex justify-between gap-5">
                            <span className="font-sans text-slate-500">Valor Ajustado (Ŷ):</span>
                            <span>{formatarMoedaCompleta(p.valor_ajustado)}</span>
                          </div>
                          <div className="flex justify-between gap-5 border-t border-slate-100 pt-1 dark:border-slate-800">
                            <span className="font-sans text-slate-500">Resíduo (Y − Ŷ):</span>
                            <span className={p.residuo >= 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600'}>
                              {formatarMoedaCompleta(p.residuo, true)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                {ANOS_DISPONIVEIS.filter((a) => residuosPorAno[a]?.length).map((ano) => (
                  <Scatter
                    key={ano}
                    name={String(ano)}
                    data={residuosPorAno[ano]}
                    fill={CORES_ANO[ano]}
                    fillOpacity={0.82}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Sumário Completo do Modelo OLS (Statsmodels) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-1 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Sumário Técnico do Modelo OLS (Least Squares)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Variável dependente: valor_executado · Variável explicativa: valor_arrecadado
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
            Graus de liberdade: {Math.max(modelo.n - 2, 1)} residuais
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Parâmetro</th>
                <th className="px-4 py-2.5 text-right font-medium">Coeficiente</th>
                <th className="px-4 py-2.5 text-right font-medium">Erro Padrão</th>
                <th className="px-4 py-2.5 text-right font-medium">Estatística t</th>
                <th className="py-2.5 pl-4 text-right font-medium">P &gt; |t|</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums dark:divide-slate-800">
              <tr>
                <td className="py-3 pr-4 font-sans font-medium text-slate-900 dark:text-slate-100">
                  const (Intercepto β₀)
                </td>
                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                  {formatarMoedaCompleta(modelo.beta0)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                  {formatarMoedaCompacta(modelo.stdErrBeta0, 'mi')}
                </td>
                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                  {modelo.tStatBeta0.toFixed(3).replace('.', ',')}
                </td>
                <td className="py-3 pl-4 text-right text-slate-600 dark:text-slate-400">
                  {isBaseline ? '0,390' : '—'}
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-sans font-medium text-slate-900 dark:text-slate-100">
                  valor_arrecadado (Inclinação β₁)
                </td>
                <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                  {modelo.beta1.toFixed(6).replace('.', ',')}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                  {modelo.stdErrBeta1.toFixed(4).replace('.', ',')}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                  {modelo.tStatBeta1.toFixed(3).replace('.', ',')}
                </td>
                <td className="py-3 pl-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatarPValor(modelo.pValueBeta1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {isBaseline && (
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs sm:grid-cols-3 lg:grid-cols-6 dark:border-slate-800">
            <div>
              <div className="text-slate-500 dark:text-slate-400">Omnibus</div>
              <div className="mt-0.5 font-mono font-medium text-slate-900 tabular-nums dark:text-slate-100">
                {NOTEBOOK_OLS_BASELINE.omnibus.toFixed(3).replace('.', ',')}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Durbin-Watson</div>
              <div className="mt-0.5 font-mono font-medium text-slate-900 tabular-nums dark:text-slate-100">
                {NOTEBOOK_OLS_BASELINE.durbinWatson.toFixed(3).replace('.', ',')}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Jarque-Bera (JB)</div>
              <div className="mt-0.5 font-mono font-medium text-slate-900 tabular-nums dark:text-slate-100">
                {NOTEBOOK_OLS_BASELINE.jarqueBera.toFixed(3).replace('.', ',')}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Assimetria (Skew)</div>
              <div className="mt-0.5 font-mono font-medium text-slate-900 tabular-nums dark:text-slate-100">
                {NOTEBOOK_OLS_BASELINE.skew.toFixed(3).replace('.', ',')}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Curtose (Kurtosis)</div>
              <div className="mt-0.5 font-mono font-medium text-slate-900 tabular-nums dark:text-slate-100">
                {NOTEBOOK_OLS_BASELINE.kurtosis.toFixed(3).replace('.', ',')}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">AIC / BIC</div>
              <div className="mt-0.5 font-mono font-medium text-slate-900 tabular-nums dark:text-slate-100">
                {NOTEBOOK_OLS_BASELINE.aic} / {NOTEBOOK_OLS_BASELINE.bic}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
