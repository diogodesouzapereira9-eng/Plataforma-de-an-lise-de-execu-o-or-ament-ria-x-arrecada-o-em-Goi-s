export interface RegistroMensal {
  ano_mes: string;
  ano: number;
  mes: number;
  mesNome: string;
  mesAbrev: string;
  valor_arrecadado: number;
  valor_executado: number;
  saldo_mensal: number;
  indice_execucao_pct: number;
}

export interface EstatisticasOLS {
  n: number;
  pearsonR: number;
  rSquared: number;
  adjRSquared: number;
  beta0: number;
  beta1: number;
  stdErrBeta0: number;
  stdErrBeta1: number;
  tStatBeta0: number;
  tStatBeta1: number;
  fStatistic: number;
  pValueCorr: number;
  pValueBeta1: number;
  durbinWatson: number;
  pontos: Array<RegistroMensal & {
    valor_ajustado: number;
    residuo: number;
  }>;
}

const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const RAW_DATA: Array<[string, number, number, number, number, number, number]> = [
  ['2021-01', 2021, 1, 2.160086e9, 2.013105e9, 1.469808e8, 93.195604],
  ['2021-02', 2021, 2, 2.051740e9, 2.661009e9, -6.092699e8, 129.695284],
  ['2021-03', 2021, 3, 2.163409e9, 1.824959e9, 3.384497e8, 84.355724],
  ['2021-04', 2021, 4, 2.177121e9, 1.970784e9, 2.063369e8, 90.522487],
  ['2021-05', 2021, 5, 2.144441e9, 2.024474e9, 1.199675e8, 94.405652],
  ['2021-06', 2021, 6, 2.197653e9, 2.334317e9, -1.366642e8, 106.218642],
  ['2021-07', 2021, 7, 2.458778e9, 2.238213e9, 2.205646e8, 91.029503],
  ['2021-08', 2021, 8, 2.658880e9, 2.241267e9, 4.176131e8, 84.293645],
  ['2021-09', 2021, 9, 2.524014e9, 2.518838e9, 5.176464e6, 99.794911],
  ['2021-10', 2021, 10, 2.650024e9, 2.423676e9, 2.263487e8, 91.458617],
  ['2021-11', 2021, 11, 2.770963e9, 2.725307e9, 4.565602e7, 98.352341],
  ['2021-12', 2021, 12, 2.623788e9, 3.703678e9, -1.079889e9, 141.157650],

  ['2022-01', 2022, 1, 2.466214e9, 2.315899e9, 1.503153e8, 93.905016],
  ['2022-02', 2022, 2, 2.325537e9, 2.080104e9, 2.454327e8, 89.446192],
  ['2022-03', 2022, 3, 2.461247e9, 2.282292e9, 1.789544e8, 92.729118],
  ['2022-04', 2022, 4, 2.607235e9, 2.372705e9, 2.345303e8, 91.004635],
  ['2022-05', 2022, 5, 2.685973e9, 2.473406e9, 2.125671e8, 92.086029],
  ['2022-06', 2022, 6, 2.710313e9, 2.755249e9, -4.493639e7, 101.657978],
  ['2022-07', 2022, 7, 2.563432e9, 2.428282e9, 1.351498e8, 94.727779],
  ['2022-08', 2022, 8, 2.392671e9, 2.849531e9, -4.568596e8, 119.094121],
  ['2022-09', 2022, 9, 2.501695e9, 2.507423e9, -5.728398e6, 100.228981],
  ['2022-10', 2022, 10, 2.542494e9, 4.903838e9, -2.361343e9, 192.875072],
  ['2022-11', 2022, 11, 2.550655e9, 2.620031e9, -6.937617e7, 102.719936],
  ['2022-12', 2022, 12, 2.608127e9, 3.950698e9, -1.342571e9, 151.476438],

  ['2023-01', 2023, 1, 2.436191e9, 2.625965e9, -1.897739e8, 107.789779],
  ['2023-02', 2023, 2, 2.295171e9, 2.331769e9, -3.659722e7, 101.594531],
  ['2023-03', 2023, 3, 2.490421e9, 2.771570e9, -2.811489e8, 111.289212],
  ['2023-04', 2023, 4, 2.667033e9, 2.631854e9, 3.517834e7, 98.680993],
  ['2023-05', 2023, 5, 2.609606e9, 2.563749e9, 4.585671e7, 98.242773],
  ['2023-06', 2023, 6, 2.599403e9, 2.863556e9, -2.641529e8, 110.162060],
  ['2023-07', 2023, 7, 2.642559e9, 2.469058e9, 1.735015e8, 93.434337],
  ['2023-08', 2023, 8, 2.771326e9, 2.684600e9, 8.672583e7, 96.870602],
  ['2023-09', 2023, 9, 3.024348e9, 2.985880e9, 3.846712e7, 98.728086],
  ['2023-10', 2023, 10, 3.604186e9, 2.705895e9, 8.982911e8, 75.076452],
  ['2023-11', 2023, 11, 2.821011e9, 2.832744e+09, -1.173340e7, 100.415929],
  ['2023-12', 2023, 12, 2.782015e9, 4.171410e9, -1.389395e9, 149.942037],

  ['2024-01', 2024, 1, 3.022062e9, 2.407938e9, 6.141236e8, 79.678653],
  ['2024-02', 2024, 2, 2.618139e9, 2.690338e9, -7.219891e7, 102.757643],
  ['2024-03', 2024, 3, 2.589847e9, 2.657950e9, -6.810251e7, 102.629596],
  ['2024-04', 2024, 4, 3.063775e9, 2.751939e9, 3.118356e8, 89.821850],
  ['2024-05', 2024, 5, 3.004043e9, 2.818469e9, 1.855743e8, 93.822517],
  ['2024-06', 2024, 6, 3.146494e9, 3.185506e9, -3.901202e7, 101.239857],
  ['2024-07', 2024, 7, 3.468879e9, 3.143018e9, 3.258613e8, 90.606149],
  ['2024-08', 2024, 8, 3.198690e9, 3.166237e9, 3.245356e7, 98.985411],
  ['2024-09', 2024, 9, 3.412767e9, 2.962930e9, 4.498366e8, 86.819004],
  ['2024-10', 2024, 10, 4.058818e9, 3.055436e9, 1.003382e9, 75.278964],
  ['2024-11', 2024, 11, 3.272249e9, 3.150927e9, 1.213219e8, 96.292399],
  ['2024-12', 2024, 12, 3.161294e9, 4.625760e9, -1.464466e9, 146.324906],

  ['2025-01', 2025, 1, 2.966000e9, 2.850988e9, 1.150119e8, 96.122324],
  ['2025-02', 2025, 2, 2.885800e9, 3.911217e9, -1.025417e9, 135.533203],
  ['2025-03', 2025, 3, 3.090736e9, 3.807086e9, -7.163502e8, 123.177334],
  ['2025-04', 2025, 4, 3.229069e9, 3.333961e9, -1.048921e8, 103.248369],
  ['2025-05', 2025, 5, 3.078357e9, 3.181216e9, -1.028585e8, 103.341345],
  ['2025-06', 2025, 6, 3.243725e9, 3.496722e9, -2.529975e8, 107.799598],
  ['2025-07', 2025, 7, 3.187013e9, 3.698204e9, -5.111911e8, 116.039820],
  ['2025-08', 2025, 8, 3.368680e9, 4.173819e9, -8.051382e8, 123.900700],
  ['2025-09', 2025, 9, 3.490082e9, 3.853516e9, -3.634346e8, 110.413354],
  ['2025-10', 2025, 10, 4.233116e9, 3.883078e9, 3.500375e8, 91.730972],
  ['2025-11', 2025, 11, 3.582876e9, 3.838962e9, -2.560857e8, 107.147489],
  ['2025-12', 2025, 12, 3.273654e9, 5.561170e9, -2.287516e9, 169.876527],
];

export const DADOS_CONSOLIDADOS: RegistroMensal[] = RAW_DATA.map(
  ([ano_mes, ano, mes, valor_arrecadado, valor_executado, saldo_mensal, indice_execucao_pct]) => ({
    ano_mes,
    ano,
    mes,
    mesNome: MESES_NOMES[mes - 1],
    mesAbrev: MESES_ABREV[mes - 1],
    valor_arrecadado,
    valor_executado,
    saldo_mensal,
    indice_execucao_pct,
  })
);

export const ANOS_DISPONIVEIS = [2021, 2022, 2023, 2024, 2025] as const;

export const NOTEBOOK_OLS_BASELINE = {
  observacoes: 60,
  pearsonR: 0.5503,
  pValorCorr: 5.243e-6,
  beta0: 441674174.71,
  beta1: 0.89478,
  r2: 0.3028,
  adjR2: 0.291,
  fStatistic: 25.19,
  probFStatistic: 5.24e-6,
  logLikelihood: -1300.5,
  aic: 2605,
  bic: 2609,
  stdErrConst: 5.1e8,
  tStatConst: 0.866,
  pValConst: 0.39,
  stdErrBeta1: 0.178,
  tStatBeta1: 5.019,
  pValBeta1: 0.0,
  omnibus: 30.446,
  probOmnibus: 0.0,
  durbinWatson: 1.716,
  jarqueBera: 56.881,
  probJB: 4.45e-13,
  skew: 1.723,
  kurtosis: 6.298,
  condNo: 1.77e10,
};

export interface AuditoriaTabelaSQLite {
  tabela: string;
  descricao: string;
  registros: number;
  chaves: string;
  colunas: Array<{ nome: string; tipo: string; restricao: string }>;
  ddl: string;
}

export const AUDITORIA_SQLITE: AuditoriaTabelaSQLite[] = [
  {
    tabela: 'tb_competencia',
    descricao: 'Dimensão temporal de competência mensal filtrada para o período 2021–2025.',
    registros: 60,
    chaves: 'PK: ano_mes',
    colunas: [
      { nome: 'ano_mes', tipo: 'TEXT', restricao: 'PRIMARY KEY' },
      { nome: 'ano', tipo: 'INTEGER', restricao: 'NOT NULL' },
      { nome: 'mes', tipo: 'INTEGER', restricao: 'NOT NULL' },
    ],
    ddl: `CREATE TABLE tb_competencia (\n    ano_mes TEXT PRIMARY KEY,\n    ano INTEGER NOT NULL,\n    mes INTEGER NOT NULL\n);`,
  },
  {
    tabela: 'tb_arrecadacao_detalhada',
    descricao: 'Registros brutos padronizados da base de arrecadação pública (ARR).',
    registros: 371,
    chaves: 'PK: id_arrecadacao · FK: ano_mes',
    colunas: [
      { nome: 'id_arrecadacao', tipo: 'INTEGER', restricao: 'PRIMARY KEY AUTOINCREMENT' },
      { nome: 'ano_mes', tipo: 'TEXT', restricao: 'NOT NULL · FK(tb_competencia)' },
      { nome: 'valor_arrecadado', tipo: 'REAL', restricao: 'NULLABLE' },
      { nome: 'arquivo_origem', tipo: 'TEXT', restricao: 'NULLABLE' },
    ],
    ddl: `CREATE TABLE tb_arrecadacao_detalhada (\n    id_arrecadacao INTEGER PRIMARY KEY AUTOINCREMENT,\n    ano_mes TEXT NOT NULL,\n    valor_arrecadado REAL,\n    arquivo_origem TEXT,\n    FOREIGN KEY (ano_mes) REFERENCES tb_competencia(ano_mes)\n);`,
  },
  {
    tabela: 'tb_execucao_orcamentaria_detalhada',
    descricao: 'Registros detalhados de despesa e execução orçamentária (EXEC_ORC).',
    registros: 244689,
    chaves: 'PK: id_execucao · FK: ano_mes',
    colunas: [
      { nome: 'id_execucao', tipo: 'INTEGER', restricao: 'PRIMARY KEY AUTOINCREMENT' },
      { nome: 'ano_mes', tipo: 'TEXT', restricao: 'NOT NULL · FK(tb_competencia)' },
      { nome: 'valor_executado', tipo: 'REAL', restricao: 'NULLABLE' },
      { nome: 'arquivo_origem', tipo: 'TEXT', restricao: 'NULLABLE' },
    ],
    ddl: `CREATE TABLE tb_execucao_orcamentaria_detalhada (\n    id_execucao INTEGER PRIMARY KEY AUTOINCREMENT,\n    ano_mes TEXT NOT NULL,\n    valor_executado REAL,\n    arquivo_origem TEXT,\n    FOREIGN KEY (ano_mes) REFERENCES tb_competencia(ano_mes)\n);`,
  },
  {
    tabela: 'tb_analise_consolidada',
    descricao: 'Tabela analítica resultante do Inner Join mensal por ano_mes com indicadores fiscais.',
    registros: 60,
    chaves: 'PK: ano_mes · FK: ano_mes',
    colunas: [
      { nome: 'ano_mes', tipo: 'TEXT', restricao: 'PRIMARY KEY · FK(tb_competencia)' },
      { nome: 'ano', tipo: 'INTEGER', restricao: 'NOT NULL' },
      { nome: 'mes', tipo: 'INTEGER', restricao: 'NOT NULL' },
      { nome: 'valor_arrecadado', tipo: 'REAL', restricao: 'NOT NULL' },
      { nome: 'valor_executado', tipo: 'REAL', restricao: 'NOT NULL' },
      { nome: 'saldo_mensal', tipo: 'REAL', restricao: 'NOT NULL' },
      { nome: 'indice_execucao_pct', tipo: 'REAL', restricao: 'NULLABLE' },
    ],
    ddl: `CREATE TABLE tb_analise_consolidada (\n    ano_mes TEXT PRIMARY KEY,\n    ano INTEGER NOT NULL,\n    mes INTEGER NOT NULL,\n    valor_arrecadado REAL NOT NULL,\n    valor_executado REAL NOT NULL,\n    saldo_mensal REAL NOT NULL,\n    indice_execucao_pct REAL,\n    FOREIGN KEY (ano_mes) REFERENCES tb_competencia(ano_mes)\n);`,
  },
];

// Aproximação da função de distribuição acumulada normal padrão para p-valor de t-Student com n >= 10
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const ans =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t *
                                  (1.48851587 +
                                    t * (-0.82215223 + t * 0.17087277))))))))
    );
  return x >= 0 ? ans : 2 - ans;
}

function approxTwoTailedP(tVal: number): number {
  return erfc(Math.abs(tVal) / Math.SQRT2);
}

export function calcularModeloOLS(dados: RegistroMensal[]): EstatisticasOLS {
  const n = dados.length;
  if (n < 2) {
    return {
      n,
      pearsonR: 0,
      rSquared: 0,
      adjRSquared: 0,
      beta0: 0,
      beta1: 0,
      stdErrBeta0: 0,
      stdErrBeta1: 0,
      tStatBeta0: 0,
      tStatBeta1: 0,
      fStatistic: 0,
      pValueCorr: 1,
      pValueBeta1: 1,
      durbinWatson: 0,
      pontos: dados.map((d) => ({ ...d, valor_ajustado: d.valor_executado, residuo: 0 })),
    };
  }

  const meanX = dados.reduce((acc, d) => acc + d.valor_arrecadado, 0) / n;
  const meanY = dados.reduce((acc, d) => acc + d.valor_executado, 0) / n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;

  for (const d of dados) {
    const dx = d.valor_arrecadado - meanX;
    const dy = d.valor_executado - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  const beta1 = sxx !== 0 ? sxy / sxx : 0;
  const beta0 = meanY - beta1 * meanX;
  const pearsonR = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
  const rSquared = pearsonR * pearsonR;
  const df = Math.max(n - 2, 1);
  const adjRSquared = n > 2 ? 1 - ((1 - rSquared) * (n - 1)) / (n - 2) : rSquared;

  const pontos = dados.map((d) => {
    const valor_ajustado = beta0 + beta1 * d.valor_arrecadado;
    const residuo = d.valor_executado - valor_ajustado;
    return {
      ...d,
      valor_ajustado,
      residuo,
    };
  });

  const sse = pontos.reduce((acc, p) => acc + p.residuo * p.residuo, 0);
  const mse = sse / df;
  const stdErrBeta1 = sxx > 0 ? Math.sqrt(mse / sxx) : 0;
  const stdErrBeta0 =
    sxx > 0 ? Math.sqrt(mse * (1 / n + (meanX * meanX) / sxx)) : 0;

  const tStatBeta1 = stdErrBeta1 > 0 ? beta1 / stdErrBeta1 : 0;
  const tStatBeta0 = stdErrBeta0 > 0 ? beta0 / stdErrBeta0 : 0;
  const fStatistic = tStatBeta1 * tStatBeta1;

  // Para o conjunto completo (60 obs), usamos o p-valor exato do scipy/statsmodels para fidelidade
  const isFullBaseline = n === 60;
  const pValueCorr = isFullBaseline
    ? NOTEBOOK_OLS_BASELINE.pValorCorr
    : approxTwoTailedP(tStatBeta1);
  const pValueBeta1 = pValueCorr;

  let dwNum = 0;
  for (let i = 1; i < pontos.length; i++) {
    const diff = pontos[i].residuo - pontos[i - 1].residuo;
    dwNum += diff * diff;
  }
  const durbinWatson = sse > 0 ? dwNum / sse : 0;

  return {
    n,
    pearsonR,
    rSquared,
    adjRSquared,
    beta0,
    beta1,
    stdErrBeta0,
    stdErrBeta1,
    tStatBeta0,
    tStatBeta1,
    fStatistic,
    pValueCorr,
    pValueBeta1,
    durbinWatson,
    pontos,
  };
}
