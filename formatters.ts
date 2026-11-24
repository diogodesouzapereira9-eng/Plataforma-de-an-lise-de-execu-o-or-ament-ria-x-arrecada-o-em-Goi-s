export type UnidadeMonetaria = 'bi' | 'mi';

export function formatarMoedaCompacta(
  valor: number,
  unidade: UnidadeMonetaria = 'bi',
  comSinal = false
): string {
  const divisor = unidade === 'bi' ? 1e9 : 1e6;
  const sufixo = unidade === 'bi' ? 'bi' : 'mi';
  const convertido = valor / divisor;
  const absVal = Math.abs(convertido);
  const formatted = absVal.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (valor < 0) {
    return `-R$ ${formatted} ${sufixo}`;
  }
  if (comSinal && valor > 0) {
    return `+R$ ${formatted} ${sufixo}`;
  }
  return `R$ ${formatted} ${sufixo}`;
}

export function formatarMoedaCompleta(valor: number, comSinal = false): string {
  const absVal = Math.abs(valor);
  const formatted = absVal.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (valor < 0) {
    return `-R$ ${formatted}`;
  }
  if (comSinal && valor > 0) {
    return `+R$ ${formatted}`;
  }
  return `R$ ${formatted}`;
}

export function formatarPercentual(valor: number, casas = 2): string {
  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

export function formatarPValor(p: number): string {
  if (p < 0.0001) {
    return p.toExponential(4).replace('.', ',');
  }
  return p.toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

export function exportarParaCSV(
  linhas: Array<{
    ano_mes: string;
    ano: number;
    mes: number;
    valor_arrecadado: number;
    valor_executado: number;
    saldo_mensal: number;
    indice_execucao_pct: number;
  }>,
  nomeArquivo = 'analise_consolidada_2021_2025.csv'
): void {
  const cabecalho = [
    'ano_mes',
    'ano',
    'mes',
    'valor_arrecadado',
    'valor_executado',
    'saldo_mensal',
    'indice_execucao_pct',
  ].join(';');

  const corpo = linhas
    .map((l) =>
      [
        l.ano_mes,
        l.ano,
        l.mes,
        l.valor_arrecadado.toFixed(2),
        l.valor_executado.toFixed(2),
        l.saldo_mensal.toFixed(2),
        l.indice_execucao_pct.toFixed(6),
      ].join(';')
    )
    .join('\n');

  const csvContent = '\uFEFF' + cabecalho + '\n' + corpo;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', nomeArquivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
