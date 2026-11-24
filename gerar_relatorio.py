"""Gera o Relatório Técnico Executivo (PDF) a partir do banco SQLite.

Uso:
  python gerar_relatorio.py --autor "Seu Nome" --saida relatorio_tecnico.pdf

Todos os números do PDF são lidos do banco (nada é digitado à mão).
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import tempfile
from contextlib import closing
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape

import matplotlib
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from graficos import (
    fig_barras, fig_boxplot_ano, fig_diagrama_er, fig_dispersao_regressao, fig_distribuicao, fig_serie_temporal,
)
from modelo import (
    ajustar_regressao, equacao_texto, formatar_brl, formatar_decimal, interpretar_correlacao, prever,
)

RAIZ = Path(__file__).resolve().parent


def registrar_fontes() -> None:
    """DejaVu (acompanha o matplotlib) suporta acentos e o símbolo Ŷ."""
    pasta = Path(matplotlib.get_data_path()) / "fonts" / "ttf"
    pdfmetrics.registerFont(TTFont("DejaVu", str(pasta / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVu-Bold", str(pasta / "DejaVuSans-Bold.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVu-Italic", str(pasta / "DejaVuSans-Oblique.ttf")))
    pdfmetrics.registerFontFamily("DejaVu", normal="DejaVu", bold="DejaVu-Bold", italic="DejaVu-Italic", boldItalic="DejaVu-Bold")


def estilos() -> dict[str, ParagraphStyle]:
    base = dict(fontName="DejaVu", fontSize=9.5, leading=14, textColor=colors.HexColor("#1f2937"))
    return {
        "corpo": ParagraphStyle("corpo", alignment=TA_JUSTIFY, spaceAfter=6, **base),
        "h1": ParagraphStyle("h1", fontName="DejaVu-Bold", fontSize=13, leading=17, spaceBefore=10, spaceAfter=6,
                             textColor=colors.HexColor("#0b3d91")),
        "titulo": ParagraphStyle("titulo", fontName="DejaVu-Bold", fontSize=19, leading=24, spaceAfter=4,
                                 textColor=colors.HexColor("#0b3d91")),
        "sub": ParagraphStyle("sub", fontName="DejaVu", fontSize=10, leading=14, textColor=colors.HexColor("#6b7280"),
                              spaceAfter=10),
        "legenda": ParagraphStyle("legenda", fontName="DejaVu-Italic", fontSize=8, leading=11,
                                  textColor=colors.HexColor("#6b7280"), spaceAfter=10),
        "formula": ParagraphStyle("formula", fontName="DejaVu-Bold", fontSize=11, leading=16, spaceBefore=4,
                                  spaceAfter=8, alignment=1),
        "celula": ParagraphStyle("celula", fontName="DejaVu", fontSize=8.5, leading=11),
    }


def p(texto: str, estilo: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(texto), estilo)


def imagem(fig, pasta: Path, nome: str, largura_cm: float = 16.5) -> Image:
    caminho = pasta / f"{nome}.png"
    fig.savefig(caminho, dpi=160, bbox_inches="tight")
    w, h = fig.get_size_inches()
    return Image(str(caminho), width=largura_cm * cm, height=largura_cm * cm * h / w)


def tabela(linhas: list[list[str]], larguras: list[float], est: dict) -> Table:
    dados = [[Paragraph(escape(str(c)), est["celula"]) for c in linha] for linha in linhas]
    t = Table(dados, colWidths=[w * cm for w in larguras], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dbe7ff")),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c7ccd6")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6f8fc")]),
    ]))
    return t


def construir(db: Path, saida: Path, autor: str, curso: str) -> None:
    registrar_fontes()
    est = estilos()
    with closing(sqlite3.connect(db)) as con:
        df = pd.read_sql_query("SELECT * FROM tb_analise_consolidada ORDER BY ano_mes", con)
        meta = pd.read_sql_query("SELECT chave, valor FROM tb_metadados", con).set_index("chave")["valor"].to_dict()
        contagens = {
            t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            for t in ("tb_competencia", "tb_arrecadacao_detalhada", "tb_execucao_orcamentaria_detalhada",
                      "tb_analise_consolidada")
        }
        funcoes = pd.read_sql_query(
            "SELECT nome_funcao AS funcao, SUM(valor_pago) AS valor_pago FROM tb_execucao_orcamentaria_detalhada "
            "GROUP BY nome_funcao ORDER BY valor_pago DESC LIMIT 10", con)
        receitas = pd.read_sql_query(
            "SELECT tipo_receita AS receita, SUM(valor_arrecadado) AS valor_arrecadado FROM tb_arrecadacao_detalhada "
            "GROUP BY tipo_receita ORDER BY valor_arrecadado DESC LIMIT 10", con)

    modelo = ajustar_regressao(df["valor_arrecadado"], df["valor_executado"])
    auditoria = json.loads(meta.get("auditoria", "{}"))
    verificacoes = json.loads(meta.get("verificacoes", "[]"))
    periodo = f"{df['ano_mes'].iloc[0]} a {df['ano_mes'].iloc[-1]}"

    x_cenario = float(df["valor_arrecadado"].mean() * 1.10)
    pasta_img = Path(tempfile.mkdtemp(prefix="rel_icms_"))

    # ------------------------------------------------------------------ texto
    el: list = []
    el.append(p("Relatório Técnico Executivo", est["titulo"]))
    el.append(p("Arrecadação (ICMS e demais receitas) x Execução Orçamentária – Estado de Goiás", est["sub"]))
    linha_autor = " • ".join(x for x in (autor, curso, datetime.now().strftime("%d/%m/%Y")) if x)
    el.append(p(linha_autor, est["sub"]))

    el.append(p("1. Justificativa do problema de negócio", est["h1"]))
    el.append(p(
        "O ICMS (Imposto sobre Circulação de Mercadorias e Serviços) é um tributo estadual e, de modo geral, uma das "
        "principais fontes de receita própria dos estados brasileiros. A pergunta de negócio deste trabalho é: o ritmo "
        "da despesa efetivamente paga pelo Estado acompanha o volume arrecadado mês a mês? Responder isso apoia a "
        "programação financeira, a previsão de caixa e a transparência na aplicação dos recursos públicos.", est["corpo"]))
    el.append(p(
        "Indicador escolhido para o cruzamento: a execução orçamentária (valor pago), obtida na base de execução "
        "orçamentária funcional do portal Dados Abertos Goiás. A variável explicativa X é a receita arrecadada mensal "
        f"(base ARR; receita considerada: {meta.get('filtro_receita', 'n/d')}) e a variável resposta Y é a despesa paga "
        f"no mesmo mês. Período analisado: {periodo} ({len(df)} meses).", est["corpo"]))

    el.append(p("2. Modelagem e integridade do banco de dados", est["h1"]))
    el.append(p(
        "Os dados foram extraídos dos arquivos ZIP do portal, tratados em Python (pandas/numpy) e armazenados em um "
        "banco relacional SQLite. A dimensão tb_competencia (mês) relaciona-se com duas tabelas de fatos em nível de "
        "registro (arrecadação e execução) e com a tabela analítica consolidada usada pela regressão.", est["corpo"]))
    el.append(imagem(fig_diagrama_er(), pasta_img, "er", 16.5))
    el.append(p("Figura 1 – Diagrama físico do banco de dados.", est["legenda"]))

    linhas = [["Tabela", "Registros"]] + [[k, f"{v:,}".replace(",", ".")] for k, v in contagens.items()]
    el.append(tabela(linhas, [11, 5], est))
    el.append(Spacer(1, 8))
    el.append(p(
        "Validações de integridade executadas (tipagem, nulos, duplicidades e variância das variáveis):", est["corpo"]))
    linhas = [["Verificação", "Resultado", "Detalhe"]] + [
        [v["verificacao"], "OK" if v["ok"] else "FALHA", v.get("detalhe", "")] for v in verificacoes
    ]
    el.append(tabela(linhas, [9.5, 2, 5], est))
    if auditoria:
        el.append(Spacer(1, 6))
        el.append(p(
            "Tratamento aplicado: duplicatas removidas – ARR: "
            f"{auditoria.get('ARR_duplicatas_removidas', 0)}, execução: {auditoria.get('EXEC_duplicatas_removidas', 0)}; "
            f"registros com valor nulo removidos – ARR: {auditoria.get('ARR_nulos_removidos', 0)}, "
            f"execução: {auditoria.get('EXEC_nulos_removidos', 0)}.", est["corpo"]))

    el.append(PageBreak())
    el.append(p("3. Formulação matemática e estatística", est["h1"]))
    el.append(p(
        "Foi ajustado um modelo de regressão linear simples por mínimos quadrados ordinários, em que a despesa paga "
        "mensal é explicada pela arrecadação mensal:", est["corpo"]))
    el.append(p("Ŷ = b + a · X", est["formula"]))
    el.append(p(
        "a = Σ(xᵢ − x̄)(yᵢ − ȳ) / Σ(xᵢ − x̄)²   (coeficiente de inclinação)      b = ȳ − a · x̄   (intercepto)",
        est["corpo"]))
    linhas = [
        ["Parâmetro", "Valor"],
        ["Observações (n)", str(modelo.n)],
        ["Inclinação (a)", formatar_decimal(modelo.a, 6)],
        ["Intercepto (b)", formatar_brl(modelo.b)],
        ["Correlação de Pearson (r)", formatar_decimal(modelo.r, 4)],
        ["Coeficiente de determinação (R²)", formatar_decimal(modelo.r2, 4)],
        ["Erro-padrão de a", formatar_decimal(modelo.erro_padrao_a, 6)],
        ["p-valor do teste H0: a = 0", f"{modelo.p_valor:.3e}"],
    ]
    el.append(tabela(linhas, [9, 7.5], est))
    el.append(Spacer(1, 6))
    el.append(p(f"Equação ajustada: {equacao_texto(modelo)}", est["formula"]))
    el.append(p("Interpretação: " + interpretar_correlacao(modelo), est["corpo"]))
    el.append(p(
        "Limitações: (i) os valores são nominais, não deflacionados; séries monetárias com tendência comum podem "
        "inflar a correlação; (ii) a base tem poucas observações mensais e não modela sazonalidade; (iii) correlação "
        "não implica causalidade – a execução também depende de decisões orçamentárias, empenhos de exercícios "
        "anteriores e outras fontes de recurso.", est["corpo"]))

    el.append(PageBreak())
    el.append(p("4. Visões, filtros e cenários preditivos do painel BI", est["h1"]))
    el.append(p(
        "As figuras abaixo são geradas pelas mesmas funções do painel Streamlit (app.py), a partir das consultas ao "
        "banco SQLite.", est["corpo"]))
    el.append(imagem(fig_serie_temporal(df), pasta_img, "serie", 16))
    el.append(p("Figura 2 – Série mensal de arrecadação e execução paga.", est["legenda"]))
    el.append(imagem(fig_distribuicao(df), pasta_img, "dist", 16))
    el.append(p("Figura 3 – Distribuição mensal das duas variáveis.", est["legenda"]))
    el.append(imagem(fig_boxplot_ano(df), pasta_img, "box", 16))
    el.append(p("Figura 4 – Boxplots por ano.", est["legenda"]))
    el.append(imagem(fig_barras(funcoes, "funcao", "valor_pago", "Despesa paga por função (top 10)"), pasta_img, "func", 16))
    el.append(p("Figura 5 – Funções de governo com maior despesa paga no período.", est["legenda"]))
    el.append(imagem(fig_barras(receitas, "receita", "valor_arrecadado", "Arrecadação por tipo de receita (top 10)",
                                "#1f6feb"), pasta_img, "rec", 16))
    el.append(p("Figura 6 – Tipos de receita com maior arrecadação no período.", est["legenda"]))
    el.append(imagem(fig_dispersao_regressao(df, modelo), pasta_img, "reg", 16))
    el.append(p("Figura 7 – Dispersão com a reta de melhor ajuste em destaque.", est["legenda"]))
    el.append(imagem(fig_dispersao_regressao(df, modelo, x_novo=x_cenario), pasta_img, "sim", 16))
    el.append(p("Figura 8 – Cenário preditivo: arrecadação 10% acima da média mensal.", est["legenda"]))

    cenarios = [
        ("Mínimo observado", float(df["valor_arrecadado"].min())),
        ("Mediana observada", float(df["valor_arrecadado"].median())),
        ("Média observada", float(df["valor_arrecadado"].mean())),
        ("Máximo observado", float(df["valor_arrecadado"].max())),
        ("Média + 10% (cenário simulado)", x_cenario),
    ]
    linhas = [["Cenário", "Arrecadação X", "Execução estimada Ŷ"]]
    for nome, x in cenarios:
        linhas.append([nome, formatar_brl(x), formatar_brl(float(prever(modelo, x)))])
    el.append(tabela(linhas, [6.5, 5, 5], est))

    el.append(p("5. Reprodutibilidade", est["h1"]))
    el.append(p(
        "Repositório com scripts de ETL (etl.py), DDL (sql/schema.sql), painel (app.py) e dependências "
        "(requirements.txt). Para reproduzir: python etl.py → streamlit run app.py → python gerar_relatorio.py.",
        est["corpo"]))

    doc = SimpleDocTemplate(str(saida), pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.8 * cm,
                            bottomMargin=1.8 * cm, title="Relatório Técnico Executivo", author=autor or "")
    doc.build(el)
    print(f"Relatório gerado: {saida}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Gera o relatório técnico em PDF")
    ap.add_argument("--db", type=Path, default=RAIZ / "data" / "financas_publicas.db")
    ap.add_argument("--saida", type=Path, default=RAIZ / "relatorio_tecnico.pdf")
    ap.add_argument("--autor", default="")
    ap.add_argument("--curso", default="")
    a = ap.parse_args()
    construir(a.db, a.saida, a.autor, a.curso)


if __name__ == "__main__":
    main()
