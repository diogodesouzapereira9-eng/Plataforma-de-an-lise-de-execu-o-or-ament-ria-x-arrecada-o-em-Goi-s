import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ANOS_DISPONIVEIS, DADOS_CONSOLIDADOS } from '../data/financasData';
import {
  formatarMoedaCompacta,
  formatarMoedaCompleta,
  formatarPercentual,
  UnidadeMonetaria,
} from '../utils/formatters';

interface TimeSeriesViewProps {
  unidade: UnidadeMonetaria;
  onMudarUnidade: (unidade: UnidadeMonetaria) => void;
}

type MetricaComparativa = 'valor_arrecadado' | 'valor_executado' | 'saldo_mensal' | 'indice_execucao_pct';

const CORES_ANO: Record<number, string> = {
  2021: '#94A3B8',
  2022: '#D97706',
  2023: '#059669',
  2024: '#2563EB',
  2025: '#0F172A',
};

const LABELS_METRICA: Record<MetricaComparativa, string> = {
  valor_arrecadado: 'Arrecadação Mensal',
  valor_executado: 'Execução Orçamentária',
  saldo_mensal: 'Saldo Mensal',
  indice_execucao_pct: 'Índice de Execução (%)',
};

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const TimeSeriesView: React.FC<TimeSeriesViewProps> = ({
  unidade,
  onMudarUnidade,
}) => {
  const [metrica, setMetrica] = useState<MetricaComparativa>('valor_arrecadado');
  const [anosVisiveis, setAnosVisiveis] = useState<number[]>([2021, 2022, 2023, 2024, 2025]);

  const divisor = unidade === 'bi' ? 1e9 : 1e6;
  const sufixo = unidade === 'bi' ? 'bi' : 'mi';

  const toggleAno = (ano: number) => {
    setAnosVisiveis((prev) => {
      if (prev.includes(ano)) {
        if (prev.length === 1) return prev;
        return prev.filter((a) => a !== ano);
      }
      return [...prev, ano].sort();
    });
  };

  const dadosInteranuais = useMemo(() => {
    return MESES_ABREV.map((mesAbrev, idx) => {
      const mesNum = idx + 1;
      const linha: Record<string, string | number> = { mesAbrev, mesNum };

      for (const ano of ANOS_DISPONIVEIS) {
        const reg = DADOS_CONSOLIDADOS.find((d) => d.ano === ano && d.mes === mesNum);
        if (reg) {
          const valRaw = reg[metrica];
          linha[`y_${ano}`] =
            metrica === 'indice_execucao_pct'
              ? Number(valRaw.toFixed(2))
              : Number((valRaw / divisor).toFixed(3));
          linha[`raw_${ano}`] = valRaw;
        }
      }
      return linha;
    });
  }, [metrica, divisor]);

  const perfilSazonal = useMemo(() => {
    return MESES_ABREV.map((mesAbrev, idx) => {
      const mesNum = idx + 1;
      const regs = DADOS_CONSOLIDADOS.filter((d) => d.mes === mesNum);
      const mediaArr = regs.reduce((a, r) => a + r.valor_arrecadado, 0) / regs.length;
      const mediaExec = regs.reduce((a, r) => a + r.valor_executado, 0) / regs.length;
      const mediaIndice = regs.reduce((a, r) => a + r.indice_execucao_pct, 0) / regs.length;
      const mediaSaldo = mediaArr - mediaExec;

      return {
        mesAbrev,
        mesNome: regs[0]?.mesNome || mesAbrev,
        mediaArrEsc: Number((mediaArr / divisor).toFixed(3)),
        mediaExecEsc: Number((mediaExec / divisor).toFixed(3)),
        mediaArr,
        mediaExec,
        mediaSaldo,
        mediaIndice,
      };
    });
  }, [divisor]);

  return (
    <div className="space-y-6">
      {/* Header e Controles */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Série Temporal & Sazonalidade
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Comparativo interanual mês a mês (2021–2025) e médias sazonais por competência
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
        </div>
      </div>

      {/* Comparativo Interanual */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Trajetória Interanual — {LABELS_METRICA[metrica]}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Sobreposição dos cinco exercícios fiscais para identificação de tendência e desvios
            </p>
          </div>

          <div
            role="group"
            aria-label="Selecionar métrica"
            className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-950"
          >
            {(Object.keys(LABELS_METRICA) as MetricaComparativa[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setMetrica(key)}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  metrica === key
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {LABELS_METRICA[key]}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles de Anos */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Exercícios exibidos:
          </span>
          {ANOS_DISPONIVEIS.map((ano) => {
            const ativo = anosVisiveis.includes(ano);
            return (
              <button
                key={ano}
                type="button"
                onClick={() => toggleAno(ano)}
                className={`inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${
                  ativo
                    ? 'border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                    : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-600'
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-xs"
                  style={{
                    backgroundColor: ativo ? CORES_ANO[ano] : '#CBD5E1',
                  }}
                />
                {ano}
              </button>
            );
          })}
        </div>

        <div className="mt-4 h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosInteranuais} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="mesAbrev"
                tick={{ fontSize: 12, fill: '#64748B' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  metrica === 'indice_execucao_pct' ? `${v}%` : `${v.toFixed(1)} ${sufixo}`
                }
                width={68}
              />
              {metrica === 'saldo_mensal' && (
                <ReferenceLine y={0} stroke="#64748B" strokeDasharray="4 4" />
              )}
              {metrica === 'indice_execucao_pct' && (
                <ReferenceLine y={100} stroke="#DC2626" strokeDasharray="4 4" />
              )}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        Competência: {label}
                      </div>
                      <div className="mt-2 space-y-1 font-mono tabular-nums">
                        {payload.map((entry) => {
                          const anoStr = String(entry.dataKey).replace('y_', '');
                          const raw = Number(entry.payload[`raw_${anoStr}`]);
                          return (
                            <div key={anoStr} className="flex items-center justify-between gap-6">
                              <span className="flex items-center gap-1.5 font-sans text-slate-600 dark:text-slate-300">
                                <span
                                  className="inline-block h-2 w-2 rounded-xs"
                                  style={{ backgroundColor: entry.color }}
                                />
                                {anoStr}
                              </span>
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {metrica === 'indice_execucao_pct'
                                  ? formatarPercentual(raw)
                                  : formatarMoedaCompleta(raw, metrica === 'saldo_mensal')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
              {ANOS_DISPONIVEIS.filter((a) => anosVisiveis.includes(a)).map((ano) => (
                <Line
                  key={ano}
                  type="monotone"
                  dataKey={`y_${ano}`}
                  name={String(ano)}
                  stroke={CORES_ANO[ano]}
                  strokeWidth={ano === 2025 ? 2.5 : 1.8}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Perfil Sazonal Médio */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Média Sazonal: Arrecadação vs. Execução (2021–2025)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Comportamento médio mensal evidenciando picos de arrecadação em outubro e liquidações em dezembro
            </p>
          </div>

          <div className="mt-4 h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perfilSazonal} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="mesAbrev"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
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
                    const row = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          Média Histórica · {row.mesNome}
                        </div>
                        <div className="mt-2 space-y-1 font-mono tabular-nums">
                          <div className="flex justify-between gap-5">
                            <span className="font-sans text-slate-500">Arrecadação Média:</span>
                            <span className="text-blue-600">{formatarMoedaCompacta(row.mediaArr, unidade)}</span>
                          </div>
                          <div className="flex justify-between gap-5">
                            <span className="font-sans text-slate-500">Execução Média:</span>
                            <span className="text-amber-600">{formatarMoedaCompacta(row.mediaExec, unidade)}</span>
                          </div>
                          <div className="flex justify-between gap-5 border-t border-slate-100 pt-1 dark:border-slate-800">
                            <span className="font-sans text-slate-500">Índice Médio:</span>
                            <span className="font-semibold">{formatarPercentual(row.mediaIndice)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="mediaArrEsc" name="Arrecadação Média" fill="#2563EB" radius={[2, 2, 0, 0]} />
                <Bar dataKey="mediaExecEsc" name="Execução Média" fill="#D97706" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Insights Sazonais Diretos */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Destaques Sazonais da Série
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Padrões recorrentes observados entre janeiro de 2021 e dezembro de 2025
            </p>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            <div className="py-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Pressão de Encerramento em Dezembro
                </span>
                <span className="font-mono font-semibold text-red-600 tabular-nums dark:text-red-400">
                  151,76% média
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Em todos os cinco exercícios, dezembro apresenta o maior volume executado do ano (atingindo R$ 5,56 bi em 2025-12), gerando déficits sazonais sistemáticos.
              </p>
            </div>

            <div className="py-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Pico de Arrecadação em Outubro
                </span>
                <span className="font-mono font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                  R$ 4,23 bi (2025-10)
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Outubro concentra os maiores picos de receita em 2023 (R$ 3,60 bi), 2024 (R$ 4,06 bi) e 2025 (R$ 4,23 bi). Em 2022-10 ocorreu anomalia de execução (R$ 4,90 bi · 192,88%).
              </p>
            </div>

            <div className="py-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  Inflexão Fiscal no Exercício 2025
                </span>
                <span className="font-mono font-semibold text-amber-600 tabular-nums dark:text-amber-400">
                  10 de 12 meses em déficit
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Diferente de 2021–2024, o exercício de 2025 apresentou execução superior à arrecadação em 10 competências, com apenas janeiro e outubro em superávit.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
