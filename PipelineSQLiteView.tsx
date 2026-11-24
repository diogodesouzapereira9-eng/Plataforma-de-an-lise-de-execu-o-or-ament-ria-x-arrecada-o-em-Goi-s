import React, { useState } from 'react';
import { AUDITORIA_SQLITE } from '../data/financasData';

const ETAPAS_ETL = [
  {
    numero: '01',
    titulo: 'Leitura Resiliente e Descompactação',
    funcao: 'listar_csvs_pasta / ler_csv_resiliente',
    descricao:
      'Extração automática de pacotes .zip, descarte de arquivos HTML inválidos e detecção combinada de encoding (utf-8-sig, latin1, cp1252) com separadores ; ou ,.',
  },
  {
    numero: '02',
    titulo: 'Extração de Competência (2021–2025)',
    funcao: 'extrair_competencia',
    descricao:
      'Normalização de ano e mês via colunas nativas ou regex no nome do arquivo, aplicando filtro entre 2021 e 2025 e gerando a chave primária ano_mes (AAAA-MM).',
  },
  {
    numero: '03',
    titulo: 'Unificação Monetária Brasileira',
    funcao: 'limpar_numero_br / extrair_coluna_monetaria',
    descricao:
      'Remoção de prefixos R$, separadores de milhar e conversão de vírgula decimal. Priorização semântica para arrecadação (arrecad, total) e execução (pago, liquid, empenh).',
  },
  {
    numero: '04',
    titulo: 'Agregação Mensal e Ingestão SQLite',
    funcao: 'pd.merge(how="inner") → financas_publicas.db',
    descricao:
      'Cruzamento mensal por ano_mes com cálculo de saldo_mensal e indice_execucao_pct, seguido de persistência relacional com integridade referencial (PRAGMA foreign_keys = ON).',
  },
];

export const PipelineSQLiteView: React.FC = () => {
  const [tabelaAtiva, setTabelaAtiva] = useState<string>('tb_analise_consolidada');

  const esquemaSelecionado =
    AUDITORIA_SQLITE.find((t) => t.tabela === tabelaAtiva) || AUDITORIA_SQLITE[3];

  const totalRegistros = AUDITORIA_SQLITE.reduce((acc, t) => acc + t.registros, 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Pipeline ETL & Auditoria SQLite
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Arquitetura de ingestão de dados, normalização e esquema relacional em financas_publicas.db
          </p>
        </div>
        <div className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
          Volume total auditado: {totalRegistros.toLocaleString('pt-BR')} registros
        </div>
      </div>

      {/* 4 Etapas do Pipeline */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ETAPAS_ETL.map((etapa) => (
          <div
            key={etapa.numero}
            className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                Etapa {etapa.numero}
              </span>
            </div>
            <h2 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {etapa.titulo}
            </h2>
            <div className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {etapa.funcao}
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {etapa.descricao}
            </p>
          </div>
        ))}
      </section>

      {/* Auditoria de Ingestão (4 Tabelas) */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Auditoria de Volumetria no Banco Relacional
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Selecione uma tabela para inspecionar sua estrutura de colunas, chaves estrangeiras e script DDL
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {AUDITORIA_SQLITE.map((item) => {
            const ativo = item.tabela === tabelaAtiva;
            return (
              <button
                key={item.tabela}
                type="button"
                onClick={() => setTabelaAtiva(item.tabela)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  ativo
                    ? 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="truncate font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {item.tabela}
                </div>
                <div className="mt-2 font-mono text-xl font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                  {item.registros.toLocaleString('pt-BR')}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  registros inseridos · {item.chaves}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detalhe do Esquema Selecionado */}
        <div className="mt-6 grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 lg:grid-cols-12 dark:border-slate-800">
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                {esquemaSelecionado.tabela}
              </h3>
              <span className="font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
                {esquemaSelecionado.registros.toLocaleString('pt-BR')} linhas
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {esquemaSelecionado.descricao}
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2 pr-3 font-medium">Coluna</th>
                    <th className="px-3 py-2 font-medium">Tipo SQL</th>
                    <th className="py-2 pl-3 font-medium">Restrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono dark:divide-slate-800">
                  {esquemaSelecionado.colunas.map((col) => (
                    <tr key={col.nome}>
                      <td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-slate-100">
                        {col.nome}
                      </td>
                      <td className="px-3 py-2.5 text-blue-600 dark:text-blue-400">{col.tipo}</td>
                      <td className="py-2.5 pl-3 font-sans text-slate-600 dark:text-slate-400">
                        {col.restricao}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Definição DDL (SQLite)
            </div>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
              {esquemaSelecionado.ddl}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
};
