"""Pipeline ETL: ZIPs do portal Dados Abertos Goiás -> banco SQLite.

Etapas
  1. Extração   : abre os .zip e separa os CSVs de arrecadação (ARR_*) e de
                  execução orçamentária (*ExecOrcamentaria*).
  2. Tratamento : normaliza nomes de colunas, converte números no padrão
                  brasileiro, remove nulos e duplicatas.
  3. Enriquec.  : agrega por mês, cruza as duas bases (inner join) e calcula
                  saldo mensal e índice de execução.
  4. Validação  : tipagem, nulos, duplicidades e variância de X e Y.
  5. Carga      : cria o banco a partir de sql/schema.sql e popula as tabelas.

Uso
  python etl.py --zips data/zips --db data/financas_publicas.db
  python etl.py --zips /content/zips --filtro-receita ICMS     # só receitas de ICMS
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import shutil
import sqlite3
import unicodedata
import zipfile
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parent
PADRAO_ANO_MES = re.compile(r"(20\d{2})(0[1-9]|1[0-2])")
MAPA_VALORES_EXEC = {
    "valor_saldo_empenhado": "valor_empenhado",
    "valor_saldo_liquidado": "valor_liquidado",
    "valor_saldo_pago": "valor_pago",
}


# --------------------------------------------------------------------------
# Utilitários de limpeza
# --------------------------------------------------------------------------
def sem_acento(texto: str) -> str:
    """Minúsculas e sem acentos (para comparações de texto)."""
    base = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode("utf-8")
    return base.lower().strip()


def normalizar_nome_coluna(col: str) -> str:
    """Remove BOM, acentos e símbolos; devolve snake_case."""
    col = str(col).strip().lstrip("﻿")
    return re.sub(r"[^a-zA-Z0-9]+", "_", sem_acento(col)).strip("_")


def limpar_numero_br(serie: pd.Series) -> pd.Series:
    """Converte números em texto para float64.

    Aceita '1.234.567,89' (padrão BR), '1234,5' e '1234.5' (ponto decimal).
    Colunas que já são numéricas são apenas convertidas para float.
    """
    if pd.api.types.is_numeric_dtype(serie):
        return serie.astype("float64")
    s = (
        serie.astype("string")
        .fillna("")
        .str.replace("R$", "", regex=False)
        .str.replace(r"\s+", "", regex=True)
    )
    usar_br = s.str.contains(",", regex=False) | (s.str.count(r"\.") > 1)
    s_br = s.str.replace(".", "", regex=False).str.replace(",", ".", regex=False)
    s = s.where(~usar_br, s_br)
    return pd.to_numeric(s, errors="coerce").astype("float64")


def _texto(serie: pd.Series) -> pd.Series:
    """Texto aparado; vazio vira None (NULL no banco)."""
    s = serie.astype("string").str.strip()
    s = s.where(s.notna() & (s != ""), None)
    return s.astype(object).where(s.notna(), None)


def _codigo(serie: pd.Series) -> pd.Series:
    """Código como texto, sem o '.0' que o pandas cria em colunas float."""
    return _texto(serie.astype("string").str.replace(r"\.0$", "", regex=True))


# --------------------------------------------------------------------------
# 1. Extração
# --------------------------------------------------------------------------
def extrair_zips(pasta_zips: Path, pasta_trabalho: Path) -> tuple[list[str], list[str]]:
    """Extrai os CSVs dos ZIPs, separando arrecadação (ARR) e execução."""
    dir_arr = pasta_trabalho / "arr"
    dir_exec = pasta_trabalho / "exec_orc"
    for d in (dir_arr, dir_exec):
        if d.exists():
            shutil.rmtree(d)
        d.mkdir(parents=True)

    zips = sorted(glob.glob(str(pasta_zips / "*.zip")))
    if not zips:
        raise FileNotFoundError(f"Nenhum .zip encontrado em {pasta_zips}")

    for caminho in zips:
        with zipfile.ZipFile(caminho) as zf:
            for membro in zf.namelist():
                nome = os.path.basename(membro)  # basename evita path traversal
                if not nome.lower().endswith(".csv"):
                    continue
                if nome.upper().startswith("ARR_"):
                    destino = dir_arr / nome
                elif "EXECORCAMENTARIA" in nome.upper():
                    destino = dir_exec / nome
                else:
                    continue
                with zf.open(membro) as origem, open(destino, "wb") as saida:
                    shutil.copyfileobj(origem, saida)

    arr = sorted(glob.glob(str(dir_arr / "*.csv")))
    exe = sorted(glob.glob(str(dir_exec / "*.csv")))
    print(f"ZIPs lidos: {len(zips)} | CSVs ARR: {len(arr)} | CSVs Execução: {len(exe)}")
    if not arr or not exe:
        raise FileNotFoundError("Não encontrei CSVs de ARR e/ou ExecOrcamentaria dentro dos ZIPs.")
    return arr, exe


# --------------------------------------------------------------------------
# 2. Leitura e consolidação bruta
# --------------------------------------------------------------------------
def ler_csv_resiliente(caminho: str) -> pd.DataFrame:
    """Testa encodings e separadores comuns em bases públicas brasileiras."""
    for enc in ("utf-8-sig", "latin1", "cp1252"):
        for sep in (";", ","):
            try:
                df = pd.read_csv(caminho, encoding=enc, sep=sep, low_memory=False)
            except Exception:
                continue
            if df.shape[1] > 1:
                df.columns = [normalizar_nome_coluna(c) for c in df.columns]
                return df
    raise ValueError(f"Não foi possível ler o arquivo: {caminho}")


def carregar_lote(arquivos: list[str], origem: str, auditoria: dict) -> pd.DataFrame:
    """Lê todos os CSVs, marca ano/mês pelo nome do arquivo e remove duplicatas."""
    frames = []
    for arq in arquivos:
        base = os.path.basename(arq)
        achou = PADRAO_ANO_MES.search(base)
        if not achou:
            print(f"  [aviso] sem AAAAMM no nome, ignorado: {base}")
            continue
        ano, mes = achou.group(1), achou.group(2)
        df = ler_csv_resiliente(arq)
        df["ano"], df["mes"] = int(ano), int(mes)
        df["ano_mes"] = f"{ano}-{mes}"
        df["arquivo_origem"] = base
        frames.append(df)
    if not frames:
        raise ValueError(f"[{origem}] nenhum arquivo com AAAAMM no nome.")

    bruto = pd.concat(frames, ignore_index=True)
    n_bruto = len(bruto)
    bruto = bruto.dropna(how="all")
    n_dup = int(bruto.duplicated().sum())
    bruto = bruto.drop_duplicates().reset_index(drop=True)
    auditoria[f"{origem}_linhas_brutas"] = n_bruto
    auditoria[f"{origem}_duplicatas_removidas"] = n_dup
    print(f"[{origem}] {len(bruto):,} registros | duplicatas removidas: {n_dup:,}")
    print(f"[{origem}] colunas: {list(bruto.columns)}")
    return bruto


# --------------------------------------------------------------------------
# 3. Tratamento específico de cada base
# --------------------------------------------------------------------------
def tratar_arr(bruto: pd.DataFrame, auditoria: dict, filtro_receita: str | None = None) -> pd.DataFrame:
    """Base de arrecadação: devolve uma linha por (mês, tipo de receita).

    O valor monetário vem de 'valor_total' ou 'valr_total' (o nome muda entre
    os anos); a coluna de texto 'tipo_receita' NUNCA é convertida em número.
    """
    df = bruto.copy()
    candidatas = [c for c in ("valor_total", "valr_total") if c in df.columns]
    if not candidatas:
        candidatas = [c for c in df.columns if c.startswith(("valor", "valr", "vlr"))]
    if not candidatas:
        raise ValueError(f"Coluna de valor não encontrada na base ARR. Colunas: {list(df.columns)}")
    print(f"[ARR] colunas de valor usadas: {candidatas}")

    valores = pd.concat([limpar_numero_br(df[c]) for c in candidatas], axis=1)
    df["valor_arrecadado"] = valores.bfill(axis=1).iloc[:, 0]  # 1º valor não nulo
    df["tipo_receita"] = _texto(df["tipo_receita"]) if "tipo_receita" in df else None
    df["tipo_grupo"] = _texto(df["tipo_grupo"]) if "tipo_grupo" in df else None

    resumo = (
        df.groupby("tipo_receita", dropna=False)["valor_arrecadado"].sum().sort_values(ascending=False)
    )
    print("[ARR] Receitas encontradas (soma do período, top 15):")
    print(resumo.head(15).apply(lambda v: f"{v:,.2f}").to_string())

    if filtro_receita:
        alvo = sem_acento(filtro_receita)
        mascara = df["tipo_receita"].fillna("").map(sem_acento).str.contains(alvo, regex=False)
        if not mascara.any():
            raise ValueError(
                f"Nenhuma receita contém '{filtro_receita}'. Disponíveis: {list(resumo.index)[:20]}"
            )
        df = df[mascara]
        print(f"[ARR] filtro '{filtro_receita}' aplicado: {len(df):,} registros mantidos")

    antes = len(df)
    df = df.dropna(subset=["ano_mes", "valor_arrecadado"])
    auditoria["ARR_nulos_removidos"] = antes - len(df)
    cols = ["ano_mes", "ano", "mes", "tipo_receita", "tipo_grupo", "valor_arrecadado", "arquivo_origem"]
    return df[cols].reset_index(drop=True)


def tratar_exec(bruto: pd.DataFrame, auditoria: dict) -> pd.DataFrame:
    """Base de execução orçamentária: valores empenhado, liquidado e pago."""
    df = bruto.rename(columns=MAPA_VALORES_EXEC).copy()
    if "valor_pago" not in df.columns:
        alternativas = [c for c in df.columns if c.startswith("valor") and "pago" in c]
        if not alternativas:
            raise ValueError(f"Coluna de valor pago não encontrada. Colunas: {list(df.columns)}")
        df = df.rename(columns={alternativas[0]: "valor_pago"})
    for c in ("valor_empenhado", "valor_liquidado", "valor_pago"):
        df[c] = limpar_numero_br(df[c]) if c in df.columns else np.nan

    for c in ("nome_funcao", "nome_orgao"):
        df[c] = _texto(df[c]) if c in df.columns else None
    for c in ("cod_funcao", "cod_orgao"):
        df[c] = _codigo(df[c]) if c in df.columns else None

    antes = len(df)
    df = df.dropna(subset=["ano_mes", "valor_pago"])
    auditoria["EXEC_nulos_removidos"] = antes - len(df)
    cols = [
        "ano_mes", "ano", "mes", "cod_funcao", "nome_funcao", "cod_orgao", "nome_orgao",
        "valor_empenhado", "valor_liquidado", "valor_pago", "arquivo_origem",
    ]
    return df[cols].reset_index(drop=True)


# --------------------------------------------------------------------------
# 4. Cruzamento mensal e validação
# --------------------------------------------------------------------------
def consolidar_mensal(arr: pd.DataFrame, exe: pd.DataFrame) -> pd.DataFrame:
    """Agrega por mês e cruza ARR (X) com execução paga (Y)."""
    arr_m = arr.groupby(["ano_mes", "ano", "mes"], as_index=False)["valor_arrecadado"].sum()
    exe_m = (
        exe.groupby("ano_mes", as_index=False)["valor_pago"].sum().rename(columns={"valor_pago": "valor_executado"})
    )
    cons = arr_m.merge(exe_m, on="ano_mes", how="inner").sort_values("ano_mes").reset_index(drop=True)
    cons["saldo_mensal"] = cons["valor_arrecadado"] - cons["valor_executado"]
    cons["indice_execucao_pct"] = np.where(
        cons["valor_arrecadado"] != 0, cons["valor_executado"] / cons["valor_arrecadado"] * 100, np.nan
    )
    return cons


def validar_integridade(arr: pd.DataFrame, exe: pd.DataFrame, cons: pd.DataFrame) -> list[dict]:
    """Valida tipagem, nulos, duplicidades e variância. Levanta erro se falhar."""
    checks: list[dict] = []

    def registrar(nome: str, ok: bool, detalhe: str = "") -> None:
        checks.append({"verificacao": nome, "ok": bool(ok), "detalhe": detalhe})

    for rotulo, df, obrig in (
        ("ARR", arr, ["ano_mes", "ano", "mes", "valor_arrecadado"]),
        ("EXEC", exe, ["ano_mes", "ano", "mes", "valor_pago"]),
        ("CONSOLIDADA", cons, ["ano_mes", "valor_arrecadado", "valor_executado"]),
    ):
        nulos = int(df[obrig].isna().sum().sum())
        registrar(f"{rotulo}: sem nulos nas colunas obrigatórias", nulos == 0, f"{nulos} nulos")
        dups = int(df.duplicated().sum())
        registrar(f"{rotulo}: sem linhas duplicadas", dups == 0, f"{dups} duplicatas")

    registrar("ARR: valor_arrecadado é float64", arr["valor_arrecadado"].dtype == "float64")
    registrar("EXEC: valor_pago é float64", exe["valor_pago"].dtype == "float64")
    registrar("ano/mes são inteiros", pd.api.types.is_integer_dtype(cons["ano"]) and pd.api.types.is_integer_dtype(cons["mes"]))
    registrar("CONSOLIDADA: ano_mes único", cons["ano_mes"].is_unique)
    registrar("CONSOLIDADA: meses entre 1 e 12", cons["mes"].between(1, 12).all())
    registrar("CONSOLIDADA: ao menos 3 meses para regressão", len(cons) >= 3, f"{len(cons)} meses")
    registrar(
        "X (arrecadação) tem variância > 0", cons["valor_arrecadado"].std() > 0,
        f"desvio-padrão = {cons['valor_arrecadado'].std():,.2f}",
    )
    registrar(
        "Y (execução) tem variância > 0", cons["valor_executado"].std() > 0,
        f"desvio-padrão = {cons['valor_executado'].std():,.2f}",
    )

    falhas = [c for c in checks if not c["ok"]]
    for c in checks:
        print(f"  [{'OK' if c['ok'] else 'FALHA'}] {c['verificacao']} {('- ' + c['detalhe']) if c['detalhe'] else ''}")
    if falhas:
        raise ValueError("Validação de integridade falhou: " + "; ".join(f["verificacao"] for f in falhas))
    return checks


# --------------------------------------------------------------------------
# 5. Carga no banco
# --------------------------------------------------------------------------
def carregar_banco(
    db_path: Path, schema_path: Path, arr: pd.DataFrame, exe: pd.DataFrame, cons: pd.DataFrame, metadados: dict
) -> dict:
    """Cria o banco a partir do DDL e popula todas as tabelas."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists():
        db_path.unlink()

    con = sqlite3.connect(db_path)
    try:
        con.executescript(schema_path.read_text(encoding="utf-8"))
        con.execute("PRAGMA foreign_keys = ON;")

        comp = cons[["ano_mes", "ano", "mes"]].drop_duplicates()
        comp.to_sql("tb_competencia", con, if_exists="append", index=False)

        arr_ok = arr[arr["ano_mes"].isin(comp["ano_mes"])].drop(columns=["ano", "mes"])
        arr_ok.to_sql("tb_arrecadacao_detalhada", con, if_exists="append", index=False, chunksize=50_000)

        exe_ok = exe[exe["ano_mes"].isin(comp["ano_mes"])].drop(columns=["ano", "mes"])
        exe_ok.to_sql("tb_execucao_orcamentaria_detalhada", con, if_exists="append", index=False, chunksize=50_000)

        cons.to_sql("tb_analise_consolidada", con, if_exists="append", index=False)

        con.executemany(
            "INSERT INTO tb_metadados (chave, valor) VALUES (?, ?)",
            [(k, str(v)) for k, v in metadados.items()],
        )
        con.commit()

        # Auditoria feita no próprio banco (SQL)
        contagens = {
            t: con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            for t in (
                "tb_competencia", "tb_arrecadacao_detalhada",
                "tb_execucao_orcamentaria_detalhada", "tb_analise_consolidada",
            )
        }
        integ = con.execute("PRAGMA integrity_check").fetchone()[0]
        fk_viol = con.execute("PRAGMA foreign_key_check").fetchall()
        tipos_ruins = con.execute(
            "SELECT (SELECT COUNT(*) FROM tb_arrecadacao_detalhada WHERE typeof(valor_arrecadado) <> 'real') +"
            "       (SELECT COUNT(*) FROM tb_execucao_orcamentaria_detalhada WHERE typeof(valor_pago) <> 'real')"
        ).fetchone()[0]
    finally:
        con.close()

    print("=== AUDITORIA NO BANCO (SQLite) ===")
    for tabela, qtd in contagens.items():
        print(f"  {tabela}: {qtd:,} registros")
    print(f"  integrity_check: {integ} | violações de FK: {len(fk_viol)} | valores com tipo inesperado: {tipos_ruins}")
    if integ != "ok" or fk_viol or tipos_ruins:
        raise RuntimeError("Falha na auditoria do banco de dados.")
    return contagens


# --------------------------------------------------------------------------
def main() -> None:
    p = argparse.ArgumentParser(description="ETL Dados Abertos Goiás -> SQLite")
    p.add_argument("--zips", type=Path, default=RAIZ / "data" / "zips", help="pasta com os .zip")
    p.add_argument("--work", type=Path, default=RAIZ / "data" / "extraidos", help="pasta temporária de extração")
    p.add_argument("--db", type=Path, default=RAIZ / "data" / "financas_publicas.db", help="banco SQLite de saída")
    p.add_argument("--schema", type=Path, default=RAIZ / "sql" / "schema.sql")
    p.add_argument("--filtro-receita", default=None, help="mantém só receitas cujo nome contenha o texto (ex.: ICMS)")
    args = p.parse_args()

    auditoria: dict = {}
    arr_csvs, exec_csvs = extrair_zips(args.zips, args.work)

    arr_bruto = carregar_lote(arr_csvs, "ARR", auditoria)
    exe_bruto = carregar_lote(exec_csvs, "EXEC", auditoria)
    arr = tratar_arr(arr_bruto, auditoria, args.filtro_receita)
    exe = tratar_exec(exe_bruto, auditoria)
    cons = consolidar_mensal(arr, exe)
    auditoria["meses_cruzados"] = len(cons)
    auditoria["periodo"] = f"{cons['ano_mes'].min()} a {cons['ano_mes'].max()}"

    print("\n=== VALIDAÇÃO DE INTEGRIDADE ===")
    checks = validar_integridade(arr, exe, cons)

    metadados = {
        "gerado_em": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "filtro_receita": args.filtro_receita or "nenhum (todas as receitas da base ARR)",
        "variavel_x": "valor_arrecadado (soma mensal da base ARR)",
        "variavel_y": "valor_executado (soma mensal de valor pago da execução orçamentária)",
        "auditoria": json.dumps(auditoria, ensure_ascii=False),
        "verificacoes": json.dumps(checks, ensure_ascii=False),
    }
    print()
    carregar_banco(args.db, args.schema, arr, exe, cons, metadados)

    # Resumo rápido da regressão (o cálculo completo está em modelo.py)
    from modelo import ajustar_regressao, equacao_texto

    res = ajustar_regressao(cons["valor_arrecadado"], cons["valor_executado"])
    print(f"\nRegressão rápida: {equacao_texto(res)} | r = {res.r:.4f} | R² = {res.r2:.4f} | n = {res.n}")
    print(f"Banco gerado em: {args.db}")


if __name__ == "__main__":
    main()
