-- Materialized view sugerida para cenários de alto volume.
-- Ela pré-agrega a operação em granularidade diária por funcionário e veículo,
-- permitindo que o dashboard some intervalos customizados sem reprocessar toda a tabela transacional.

CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_eficiencia_energetica_diaria_mv AS
SELECT
  date_trunc('day', fl."dataReferencia")::date AS referencia_dia,
  fl."funcionarioId",
  fl."veiculoId",
  COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) AS total_km,
  COALESCE(SUM(CASE WHEN fl.categoria = 'RECARGA' THEN fl.valor ELSE 0 END), 0) AS custo_real_recargas,
  COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA')::int AS total_recargas,
  COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA' AND fl.valor = 0)::int AS recargas_gratuitas
FROM "FuncionarioLancamento" fl
GROUP BY 1, 2, 3;

CREATE UNIQUE INDEX IF NOT EXISTS dashboard_eficiencia_energetica_diaria_mv_pk
  ON dashboard_eficiencia_energetica_diaria_mv (referencia_dia, "funcionarioId", "veiculoId");

CREATE INDEX IF NOT EXISTS dashboard_eficiencia_energetica_diaria_mv_funcionario_idx
  ON dashboard_eficiencia_energetica_diaria_mv ("funcionarioId", referencia_dia);

CREATE INDEX IF NOT EXISTS dashboard_eficiencia_energetica_diaria_mv_veiculo_idx
  ON dashboard_eficiencia_energetica_diaria_mv ("veiculoId", referencia_dia);

-- Atualização recomendada:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_eficiencia_energetica_diaria_mv;
-- Agende via cron/pg_cron após lotes de importação ou periodicamente.