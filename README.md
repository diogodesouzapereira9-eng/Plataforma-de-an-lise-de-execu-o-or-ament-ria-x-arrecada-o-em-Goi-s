# Arrecadação x Execução Orçamentária – Goiás

Pipeline de dados + painel de BI + regressão linear simples, com dados do portal **Dados Abertos Goiás**
(arrecadação mensal – base ARR – e execução orçamentária funcional, 2021–2025).

## Estrutura

| Arquivo | Função |
|---|---|
| `etl.py` | Extração dos ZIPs, limpeza (pandas/numpy), validação de integridade e carga no SQLite |
| `sql/schema.sql` | DDL do banco (tabelas, chaves, índices, view) |
| `modelo.py` | Regressão linear simples (Ŷ = b + a·X), interpretação e formatação em R$ |
| `graficos.py` | Gráficos (distribuição, boxplot, barras, dispersão + reta, diagrama do banco) |
| `app.py` | Painel Streamlit — lê **apenas** o banco SQLite (sem CSV em tempo de execução) |
| `gerar_relatorio.py` | Gera o Relatório Técnico Executivo em PDF a partir do banco |
| `requirements.txt` | Dependências com versões |

## Como executar

```bash
pip install -r requirements.txt

# 1) Coloque os 10 arquivos .zip em data/zips/ e gere o banco
python etl.py --zips data/zips --db data/financas_publicas.db
#    opcional: considerar só receitas cujo nome contenha "ICMS"
python etl.py --zips data/zips --filtro-receita ICMS

# 2) Painel interativo
streamlit run app.py

# 3) Relatório PDF (números lidos do banco)
python gerar_relatorio.py --autor "Seu Nome" --curso "Seu Curso" --saida relatorio_tecnico.pdf
```

### No Google Colab
```python
# envie esta pasta (ou o .zip do projeto) para /content e rode:
%cd /content/projeto_icms_goias
!pip install -q -r requirements.txt
!python etl.py --zips /content/zips --db /content/projeto_icms_goias/data/financas_publicas.db
!python gerar_relatorio.py --autor "Seu Nome"
```
O painel Streamlit é mais simples de rodar no seu computador: baixe o arquivo `financas_publicas.db`
gerado no Colab, coloque em `data/` e execute `streamlit run app.py`.

## Decisões de tratamento
- O nome da coluna de valor da base ARR muda entre anos (`valr_total` / `valor_total`); o ETL une as duas.
- Colunas de texto (ex.: `tipo_receita`) nunca são convertidas em número.
- Números no padrão brasileiro (`1.234,56`) são convertidos para `float`.
- Nulos nas colunas obrigatórias e duplicatas são removidos e contabilizados (tabela `tb_metadados`).
- O ETL **falha** se X ou Y tiver variância zero (regressão indefinida) — evita resultados `NaN` silenciosos.
- Valores monetários são nominais (sem correção pela inflação).
