"""Painel interativo de BI – Arrecadação x Execução Orçamentária (Goiás).

Executar:  streamlit run app.py

O painel lê SOMENTE o banco SQLite gerado por etl.py (nenhum CSV é lido em
tempo de execução). Para usar outro banco: ICMS_DB=/caminho/arquivo.db streamlit run app.py
"""
from __future__ import annotations

import os
import sqlite3
from contextlib import closing
from pathlib import Path

import pandas as pd
import streamlit as st

from graficos import (
    fig_barras, fig_boxplot_ano, fig_dispersao_regressao, fig_distribuicao, fig_serie_temporal,
)
from modelo import (
    ajustar_regressao, equacao_texto, formatar_brl, formatar_decimal, interpretar_correlacao, prever,
)

DB_PATH = Path(os.environ.get("ICMS_DB", Path(__file__).resolve().parent / "data" / "financas_publicas.db"))

st.set_page_config(page_title="Arrecadação x Execução – Goiás", layout="wide")


# --------------------------------------------------------------------------
# Acesso ao banco (somente leitura)
# --------------------------------------------------------------------------
@st.cache_data(show_spinner=False)
def consultar(sql: str, parametros: tuple = ()) -> pd.DataFrame:
    uri = f"{DB_PATH.resolve().as_uri()}?mode=ro"
    with closing(sqlite3.connect(uri, uri=True)) as con:
        return pd.read_sql_query(sql, con, params=parametros)


def placeholders(valores: list) -> str:
    return ",".join("?" for _ in valores)


if not DB_PATH.exists():
    st.error(f"Banco de dados não encontrado em {DB_PATH}. Execute primeiro: python etl.py")
    st.stop()

# --------------------------------------------------------------------------
# Filtros (barra lateral)
# --------------------------------------------------------------------------
st.title("Arrecadação x Execução Orçamentária – Goiás")
meta = consultar("SELECT chave, valor FROM tb_metadados").set_index("chave")["valor"].to_dict()
st.caption(
    f"Fonte: Dados Abertos Goiás • Receita considerada: {meta.get('filtro_receita', 'n/d')} • "
    f"Banco gerado em {meta.get('gerado_em', 'n/d')}"
)

anos_disponiveis = consultar("SELECT DISTINCT ano FROM tb_competencia ORDER BY ano")["ano"].tolist()
st.sidebar.header("Filtros")
anos = st.sidebar.multiselect("Anos analisados", anos_disponiveis, default=anos_disponiveis)
if not anos:
    st.warning("Selecione ao menos um ano na barra lateral.")
    st.stop()

ph = placeholders(anos)
df = consultar(
    f"SELECT * FROM tb_analise_consolidada WHERE ano IN ({ph}) ORDER BY ano_mes", tuple(anos)
)

# --------------------------------------------------------------------------
# Indicadores principais
# --------------------------------------------------------------------------
total_x = df["valor_arrecadado"].sum()
total_y = df["valor_executado"].sum()
c1, c2, c3, c4 = st.columns(4)
c1.metric("Arrecadação total", formatar_brl(total_x))
c2.metric("Execução paga total", formatar_brl(total_y))
c3.metric("Saldo (arrecadação − execução)", formatar_brl(total_x - total_y))
c4.metric("Execução / arrecadação", f"{formatar_decimal(total_y / total_x * 100, 1)}%" if total_x else "n/d")

try:
    modelo = ajustar_regressao(df["valor_arrecadado"], df["valor_executado"])
except ValueError as erro:
    modelo = None
    erro_modelo = str(erro)

aba_geral, aba_dist, aba_reg, aba_sim, aba_dados = st.tabs(
    ["Visão geral", "Distribuições e funções", "Regressão linear", "Simulador preditivo", "Dados"]
)

# --------------------------------------------------------------------------
with aba_geral:
    st.pyplot(fig_serie_temporal(df))
    por_ano = (
        df.groupby("ano", as_index=False)[["valor_arrecadado", "valor_executado"]].sum()
        .rename(columns={"valor_arrecadado": "Arrecadação (R$)", "valor_executado": "Execução paga (R$)"})
    )
    st.subheader("Totais por ano")
    st.dataframe(por_ano)

# --------------------------------------------------------------------------
with aba_dist:
    st.subheader("Distribuição mensal")
    st.pyplot(fig_distribuicao(df))
    st.subheader("Boxplot por ano")
    st.pyplot(fig_boxplot_ano(df))

    topo = st.slider("Quantidade de itens nos rankings", min_value=5, max_value=20, value=10)
    funcoes = consultar(
        "SELECT e.nome_funcao AS funcao, SUM(e.valor_pago) AS valor_pago "
        "FROM tb_execucao_orcamentaria_detalhada e JOIN tb_competencia c ON c.ano_mes = e.ano_mes "
        f"WHERE c.ano IN ({ph}) GROUP BY e.nome_funcao ORDER BY valor_pago DESC LIMIT ?",
        tuple(anos) + (topo,),
    )
    st.pyplot(fig_barras(funcoes, "funcao", "valor_pago", f"Despesa paga por função (top {topo})"))

    receitas = consultar(
        "SELECT a.tipo_receita AS receita, SUM(a.valor_arrecadado) AS valor_arrecadado "
        "FROM tb_arrecadacao_detalhada a JOIN tb_competencia c ON c.ano_mes = a.ano_mes "
        f"WHERE c.ano IN ({ph}) GROUP BY a.tipo_receita ORDER BY valor_arrecadado DESC LIMIT ?",
        tuple(anos) + (topo,),
    )
    st.pyplot(fig_barras(receitas, "receita", "valor_arrecadado", f"Arrecadação por tipo de receita (top {topo})", "#1f6feb"))

# --------------------------------------------------------------------------
with aba_reg:
    if modelo is None:
        st.error(erro_modelo)
    else:
        st.pyplot(fig_dispersao_regressao(df, modelo))
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Inclinação (a)", formatar_decimal(modelo.a, 4))
        m2.metric("Intercepto (b)", formatar_brl(modelo.b))
        m3.metric("Correlação (r)", formatar_decimal(modelo.r, 4))
        m4.metric("R²", formatar_decimal(modelo.r2, 4))
        st.markdown(f"**Equação ajustada:** `{equacao_texto(modelo)}`  •  n = {modelo.n} meses  •  p-valor (a) = {modelo.p_valor:.3e}")
        st.info(interpretar_correlacao(modelo))

# --------------------------------------------------------------------------
with aba_sim:
    st.subheader("Simulador: quanto deve ser executado dado um nível de arrecadação?")
    if modelo is None:
        st.error(erro_modelo)
    else:
        st.caption(f"Modelo ajustado com os anos selecionados: {equacao_texto(modelo)}")
        padrao = round(df["valor_arrecadado"].mean() / 1e6, 2)
        x_milhoes = st.number_input(
            "Arrecadação mensal esperada – X (R$ milhões)", min_value=0.0, value=float(padrao), step=50.0, format="%.2f"
        )
        x_reais = x_milhoes * 1e6
        y_chapeu = float(prever(modelo, x_reais))

        s1, s2 = st.columns(2)
        s1.metric("Arrecadação informada (X)", formatar_brl(x_reais))
        s2.metric("Execução estimada (Ŷ)", formatar_brl(y_chapeu))
        st.markdown(f"Cálculo: Ŷ = {formatar_decimal(modelo.b, 2)} + {formatar_decimal(modelo.a, 6)} × {formatar_decimal(x_reais, 2)}")
        if not (modelo.x_min <= x_reais <= modelo.x_max):
            st.warning(
                "Atenção: valor fora do intervalo observado "
                f"({formatar_brl(modelo.x_min)} a {formatar_brl(modelo.x_max)}). A estimativa é uma extrapolação."
            )
        st.pyplot(fig_dispersao_regressao(df, modelo, x_novo=x_reais))

# --------------------------------------------------------------------------
with aba_dados:
    st.subheader("Tabela analítica consolidada (tb_analise_consolidada)")
    st.dataframe(df)
