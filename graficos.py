"""Funções que geram as figuras (matplotlib/seaborn) usadas no painel e no relatório.

Todas devolvem um objeto Figure, sem usar pyplot, para funcionarem tanto no
Streamlit (st.pyplot) quanto na geração do PDF (fig.savefig).
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import seaborn as sns
from matplotlib.figure import Figure
from matplotlib.patches import FancyBboxPatch
from matplotlib.ticker import FuncFormatter

from modelo import ResultadoRegressao, equacao_texto, formatar_decimal, prever

COR_X = "#1f6feb"   # arrecadação
COR_Y = "#d9480f"   # execução
COR_NEUTRA = "#6b7280"

_fmt_bi = FuncFormatter(lambda v, _: formatar_decimal(v / 1e9, 1))


def _estilo() -> None:
    sns.set_theme(style="whitegrid", context="notebook")


def fig_serie_temporal(df: pd.DataFrame) -> Figure:
    _estilo()
    fig = Figure(figsize=(10, 4.2))
    ax = fig.subplots()
    x = pd.to_datetime(df["ano_mes"] + "-01")
    ax.plot(x, df["valor_arrecadado"], color=COR_X, lw=2, label="Arrecadação (X)")
    ax.plot(x, df["valor_executado"], color=COR_Y, lw=2, label="Execução paga (Y)")
    ax.yaxis.set_major_formatter(_fmt_bi)
    ax.set_ylabel("R$ bilhões")
    ax.set_title("Arrecadação x execução orçamentária por mês", fontweight="bold")
    ax.legend()
    fig.tight_layout()
    return fig


def fig_distribuicao(df: pd.DataFrame) -> Figure:
    """Histogramas (com curva de densidade) de X e Y."""
    _estilo()
    fig = Figure(figsize=(10, 4))
    ax1, ax2 = fig.subplots(1, 2)
    sns.histplot(df["valor_arrecadado"], bins=12, kde=True, color=COR_X, ax=ax1)
    sns.histplot(df["valor_executado"], bins=12, kde=True, color=COR_Y, ax=ax2)
    for ax, titulo in ((ax1, "Distribuição da arrecadação mensal"), (ax2, "Distribuição da execução paga mensal")):
        ax.xaxis.set_major_formatter(_fmt_bi)
        ax.set_xlabel("R$ bilhões")
        ax.set_ylabel("Nº de meses")
        ax.set_title(titulo, fontsize=11, fontweight="bold")
    fig.tight_layout()
    return fig


def fig_boxplot_ano(df: pd.DataFrame) -> Figure:
    """Boxplots mensais de X e Y por ano."""
    _estilo()
    fig = Figure(figsize=(10, 4))
    ax1, ax2 = fig.subplots(1, 2)
    sns.boxplot(data=df, x="ano", y="valor_arrecadado", color=COR_X, ax=ax1)
    sns.boxplot(data=df, x="ano", y="valor_executado", color=COR_Y, ax=ax2)
    for ax, titulo in ((ax1, "Arrecadação mensal por ano"), (ax2, "Execução paga mensal por ano")):
        ax.yaxis.set_major_formatter(_fmt_bi)
        ax.set_ylabel("R$ bilhões")
        ax.set_xlabel("Ano")
        ax.set_title(titulo, fontsize=11, fontweight="bold")
    fig.tight_layout()
    return fig


def fig_barras(df: pd.DataFrame, col_rotulo: str, col_valor: str, titulo: str, cor: str = COR_Y) -> Figure:
    """Barras horizontais já ordenadas (maior primeiro)."""
    _estilo()
    altura = max(3.2, 0.42 * len(df) + 1.2)
    fig = Figure(figsize=(10, altura))
    ax = fig.subplots()
    dados = df.copy()
    dados[col_rotulo] = dados[col_rotulo].fillna("(não informado)").astype(str).str.slice(0, 48)
    sns.barplot(data=dados, y=col_rotulo, x=col_valor, color=cor, ax=ax)
    ax.xaxis.set_major_formatter(_fmt_bi)
    ax.set_xlabel("R$ bilhões")
    ax.set_ylabel("")
    ax.set_title(titulo, fontweight="bold")
    fig.tight_layout()
    return fig


def fig_dispersao_regressao(
    df: pd.DataFrame, res: ResultadoRegressao, x_novo: float | None = None
) -> Figure:
    """Dispersão X vs Y com a reta de melhor ajuste em destaque (e ponto simulado opcional)."""
    _estilo()
    fig = Figure(figsize=(10, 5.2))
    ax = fig.subplots()
    ax.scatter(df["valor_arrecadado"], df["valor_executado"], s=55, alpha=0.8, color=COR_X, label="Meses observados")

    amplitude = res.x_max - res.x_min
    xs = np.linspace(res.x_min - 0.05 * amplitude, res.x_max + 0.05 * amplitude, 100)
    ax.plot(xs, prever(res, xs), color="#c92a2a", lw=3, label=f"Reta de ajuste (R² = {res.r2:.3f})")

    if x_novo is not None:
        y_novo = float(prever(res, x_novo))
        ax.scatter([x_novo], [y_novo], marker="*", s=380, color="#f59f00", edgecolor="black", zorder=5,
                   label="Cenário simulado")
        ax.axvline(x_novo, color="#f59f00", ls="--", lw=1)

    ax.xaxis.set_major_formatter(_fmt_bi)
    ax.yaxis.set_major_formatter(_fmt_bi)
    ax.set_xlabel("Arrecadação mensal – X (R$ bilhões)")
    ax.set_ylabel("Execução paga mensal – Y (R$ bilhões)")
    ax.set_title(f"Regressão linear simples  |  {equacao_texto(res)}", fontsize=11, fontweight="bold")
    ax.legend(loc="best")
    fig.tight_layout()
    return fig


def fig_diagrama_er() -> Figure:
    """Diagrama físico do banco (tabelas, chaves primárias e estrangeiras)."""
    fig = Figure(figsize=(11, 6.4))
    ax = fig.subplots()
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 64)
    ax.axis("off")

    def caixa(x, y, w, titulo, campos, cor):
        altura = 6.4 + 3.1 * len(campos)
        ax.add_patch(FancyBboxPatch((x, y), w, altura, boxstyle="round,pad=0.2,rounding_size=0.8",
                                    fc="#ffffff", ec=cor, lw=2))
        ax.add_patch(FancyBboxPatch((x, y + altura - 4.4), w, 4.4, boxstyle="round,pad=0.2,rounding_size=0.8",
                                    fc=cor, ec=cor, lw=2))
        ax.text(x + w / 2, y + altura - 2.2, titulo, ha="center", va="center", color="white",
                fontsize=9.5, fontweight="bold")
        for i, campo in enumerate(campos):
            ax.text(x + 1.2, y + altura - 7.0 - 3.1 * i, campo, ha="left", va="center",
                    fontsize=8.3, family="monospace")
        return (x + w / 2, y, y + altura)

    comp = caixa(35, 38, 30, "tb_competencia", ["PK ano_mes TEXT", "   ano INTEGER", "   mes INTEGER"], "#2b8a3e")
    arr = caixa(1, 2, 31, "tb_arrecadacao_detalhada",
                ["PK id_arrecadacao", "FK ano_mes", "   tipo_receita", "   tipo_grupo", "   valor_arrecadado REAL",
                 "   arquivo_origem"], COR_X)
    exe = caixa(34, 2, 32, "tb_execucao_orcamentaria_detalhada",
                ["PK id_execucao", "FK ano_mes", "   cod_funcao / nome_funcao", "   cod_orgao / nome_orgao",
                 "   valor_empenhado REAL", "   valor_liquidado REAL", "   valor_pago REAL"], COR_Y)
    con = caixa(68, 2, 31, "tb_analise_consolidada",
                ["PK/FK ano_mes", "   ano, mes", "   valor_arrecadado (X)", "   valor_executado (Y)",
                 "   saldo_mensal", "   indice_execucao_pct"], "#862e9c")

    for (cx, _, topo), alvo_x in ((arr, 42), (exe, 50), (con, 58)):
        ax.annotate("", xy=(alvo_x, 38), xytext=(cx, topo + 0.3),
                    arrowprops=dict(arrowstyle="-|>", color=COR_NEUTRA, lw=1.6))
        ax.text((cx + alvo_x) / 2 + 1, (topo + 38) / 2 + 3, "N : 1", fontsize=8.5, color=COR_NEUTRA)

    ax.text(2, 61, "Modelo físico (SQLite) – arrecadação x execução orçamentária", fontsize=11, fontweight="bold")
    ax.text(2, 57.5, "Tabelas auxiliares: tb_metadados (chave, valor) e vw_execucao_por_funcao (visão).",
            fontsize=8.5, color=COR_NEUTRA)
    return fig
