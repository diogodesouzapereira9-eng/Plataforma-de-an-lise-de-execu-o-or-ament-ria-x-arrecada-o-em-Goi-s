"""Regressão linear simples (Y = b + a·X) e formatação de valores em R$."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import stats


@dataclass(frozen=True)
class ResultadoRegressao:
    a: float              # coeficiente de inclinação (slope)
    b: float              # intercepto
    r: float              # correlação de Pearson
    r2: float             # coeficiente de determinação
    p_valor: float        # p-valor do teste de H0: a = 0
    erro_padrao_a: float  # erro-padrão de a
    n: int                # nº de observações (meses)
    x_min: float
    x_max: float


def ajustar_regressao(x, y) -> ResultadoRegressao:
    """Ajusta Ŷ = b + a·X por mínimos quadrados ordinários."""
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    ok = np.isfinite(x) & np.isfinite(y)
    x, y = x[ok], y[ok]
    if len(x) < 3:
        raise ValueError("São necessárias ao menos 3 observações mensais para ajustar a regressão.")
    if x.max() == x.min() or y.max() == y.min():
        raise ValueError("X ou Y é constante no período selecionado; a regressão não está definida.")
    lr = stats.linregress(x, y)
    return ResultadoRegressao(
        a=float(lr.slope), b=float(lr.intercept), r=float(lr.rvalue), r2=float(lr.rvalue**2),
        p_valor=float(lr.pvalue), erro_padrao_a=float(lr.stderr), n=int(len(x)),
        x_min=float(x.min()), x_max=float(x.max()),
    )


def prever(res: ResultadoRegressao, x):
    """Valor estimado Ŷ = b + a·X (aceita número ou array)."""
    return res.b + res.a * np.asarray(x, dtype=float)


def equacao_texto(res: ResultadoRegressao) -> str:
    sinal = "+" if res.a >= 0 else "-"
    return f"Ŷ = {formatar_decimal(res.b, 2)} {sinal} {formatar_decimal(abs(res.a), 6)}·X"


def interpretar_correlacao(res: ResultadoRegressao) -> str:
    """Texto com a leitura do grau de correlação linear."""
    forca_abs = abs(res.r)
    if forca_abs < 0.3:
        forca = "fraca"
    elif forca_abs < 0.7:
        forca = "moderada"
    elif forca_abs < 0.9:
        forca = "forte"
    else:
        forca = "muito forte"
    sentido = "positiva" if res.r >= 0 else "negativa"
    signif = (
        "estatisticamente significativa ao nível de 5% (p < 0,05)"
        if res.p_valor < 0.05
        else "não significativa ao nível de 5% (p ≥ 0,05)"
    )
    return (
        f"Correlação linear {forca} e {sentido} (r = {formatar_decimal(res.r, 4)}), {signif}. "
        f"O modelo explica {formatar_decimal(res.r2 * 100, 2)}% da variação da execução orçamentária mensal; "
        f"a cada R$ 1,00 adicional de arrecadação, a execução estimada varia R$ {formatar_decimal(res.a, 4)}."
    )


def _milhar_br(texto: str) -> str:
    return texto.replace(",", "X").replace(".", ",").replace("X", ".")


def formatar_brl(valor: float) -> str:
    """1234567.8 -> 'R$ 1.234.567,80'."""
    return "R$ " + _milhar_br(f"{valor:,.2f}")


def formatar_decimal(valor: float, casas: int = 2) -> str:
    return _milhar_br(f"{valor:,.{casas}f}")
