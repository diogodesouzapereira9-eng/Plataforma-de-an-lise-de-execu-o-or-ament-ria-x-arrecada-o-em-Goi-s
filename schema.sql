-- =====================================================================
-- Esquema relacional (SQLite) - Arrecadação x Execução Orçamentária (GO)
-- Executado automaticamente por etl.py antes da carga dos dados.
-- =====================================================================
PRAGMA foreign_keys = ON;

DROP VIEW  IF EXISTS vw_execucao_por_funcao;
DROP TABLE IF EXISTS tb_analise_consolidada;
DROP TABLE IF EXISTS tb_execucao_orcamentaria_detalhada;
DROP TABLE IF EXISTS tb_arrecadacao_detalhada;
DROP TABLE IF EXISTS tb_competencia;
DROP TABLE IF EXISTS tb_metadados;

-- Dimensão de tempo: uma linha por mês (chave natural AAAA-MM)
CREATE TABLE tb_competencia (
    ano_mes TEXT    PRIMARY KEY
                    CHECK (ano_mes GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
    ano     INTEGER NOT NULL,
    mes     INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12)
);

-- Fato: arrecadação (base ARR) no nível do registro original
CREATE TABLE tb_arrecadacao_detalhada (
    id_arrecadacao   INTEGER PRIMARY KEY AUTOINCREMENT,
    ano_mes          TEXT NOT NULL,
    tipo_receita     TEXT,
    tipo_grupo       TEXT,
    valor_arrecadado REAL NOT NULL,
    arquivo_origem   TEXT,
    FOREIGN KEY (ano_mes) REFERENCES tb_competencia (ano_mes)
);

-- Fato: execução orçamentária funcional no nível do registro original
CREATE TABLE tb_execucao_orcamentaria_detalhada (
    id_execucao     INTEGER PRIMARY KEY AUTOINCREMENT,
    ano_mes         TEXT NOT NULL,
    cod_funcao      TEXT,
    nome_funcao     TEXT,
    cod_orgao       TEXT,
    nome_orgao      TEXT,
    valor_empenhado REAL,
    valor_liquidado REAL,
    valor_pago      REAL NOT NULL,
    arquivo_origem  TEXT,
    FOREIGN KEY (ano_mes) REFERENCES tb_competencia (ano_mes)
);

-- Tabela analítica: X (arrecadação) e Y (execução paga) agregados por mês
CREATE TABLE tb_analise_consolidada (
    ano_mes             TEXT PRIMARY KEY,
    ano                 INTEGER NOT NULL,
    mes                 INTEGER NOT NULL,
    valor_arrecadado    REAL NOT NULL,
    valor_executado     REAL NOT NULL,
    saldo_mensal        REAL NOT NULL,
    indice_execucao_pct REAL,
    FOREIGN KEY (ano_mes) REFERENCES tb_competencia (ano_mes)
);

-- Rastreabilidade da execução do ETL (filtros usados, auditoria, data)
CREATE TABLE tb_metadados (
    chave TEXT PRIMARY KEY,
    valor TEXT
);

CREATE INDEX ix_arr_ano_mes  ON tb_arrecadacao_detalhada (ano_mes);
CREATE INDEX ix_exec_ano_mes ON tb_execucao_orcamentaria_detalhada (ano_mes);
CREATE INDEX ix_exec_funcao  ON tb_execucao_orcamentaria_detalhada (nome_funcao);

-- Visão usada pelo painel: despesa paga por função e ano
CREATE VIEW vw_execucao_por_funcao AS
SELECT c.ano,
       e.nome_funcao,
       SUM(e.valor_pago) AS valor_pago
FROM   tb_execucao_orcamentaria_detalhada e
JOIN   tb_competencia c ON c.ano_mes = e.ano_mes
GROUP  BY c.ano, e.nome_funcao;
