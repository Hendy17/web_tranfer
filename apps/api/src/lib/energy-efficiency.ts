import { Prisma } from "@prisma/client";
import type {
	DashboardExecutivoEmpresa,
	DashboardExecutivoResumoMensal,
	DashboardEficienciaEnergetica,
	EficienciaEnergeticaPorFuncionario,
	EficienciaEnergeticaPorVeiculo,
	ResumoEficienciaEnergetica,
} from "common-types";
import { prisma } from "@/lib/prisma";

const KM_POR_LITRO_COMBUSTAO = 10;
const PRECO_LITRO_COMBUSTAO = 6.5;
const CPK_COMBUSTAO = PRECO_LITRO_COMBUSTAO / KM_POR_LITRO_COMBUSTAO;

type ValorNumerico = Prisma.Decimal | number | string | null;
type ValorInteiro = number | bigint | null;

interface ResumoEficienciaRow {
	totalKm: ValorNumerico;
	custoRealRecargas: ValorNumerico;
	totalRecargas: ValorInteiro;
	recargasGratuitas: ValorInteiro;
	cpkReal: ValorNumerico;
	cpkCombustao: ValorNumerico;
	custoCombustaoHipotetico: ValorNumerico;
	economiaTotal: ValorNumerico;
	percentualRecargasGratuitas: ValorNumerico;
}

interface EficienciaPorVeiculoRow {
	veiculoId: number;
	nome: string;
	placa: string | null;
	totalKm: ValorNumerico;
	custoRealRecargas: ValorNumerico;
	totalRecargas: ValorInteiro;
	recargasGratuitas: ValorInteiro;
	cpkReal: ValorNumerico;
	custoCombustaoHipotetico: ValorNumerico;
	economiaTotal: ValorNumerico;
	percentualRecargasGratuitas: ValorNumerico;
}

interface EficienciaPorFuncionarioRow {
	funcionarioId: number;
	nome: string;
	veiculosAtivos: ValorInteiro;
	totalKm: ValorNumerico;
	custoRealRecargas: ValorNumerico;
	totalRecargas: ValorInteiro;
	recargasGratuitas: ValorInteiro;
	cpkReal: ValorNumerico;
	custoCombustaoHipotetico: ValorNumerico;
	economiaTotal: ValorNumerico;
	percentualRecargasGratuitas: ValorNumerico;
}

interface ResumoMensalExecutivoRow {
	referenciaMes: string;
	label: string;
	totalGanhos: ValorNumerico;
	totalGastos: ValorNumerico;
	saldo: ValorNumerico;
	totalRecargas: ValorNumerico;
	totalPrestacao: ValorNumerico;
	totalSeguro: ValorNumerico;
}

function toNumber(value: ValorNumerico) {
	if (value == null) {
		return 0;
	}

	if (typeof value === "number") {
		return value;
	}

	if (typeof value === "string") {
		return Number(value);
	}

	return Number(value.toString());
}

function toInteger(value: ValorInteiro) {
	if (value == null) {
		return 0;
	}

	return Number(value);
}

function mapResumo(row?: ResumoEficienciaRow): ResumoEficienciaEnergetica {
	return {
		totalKm: toNumber(row?.totalKm ?? 0),
		custoRealRecargas: toNumber(row?.custoRealRecargas ?? 0),
		cpkReal: toNumber(row?.cpkReal ?? 0),
		cpkCombustao: toNumber(row?.cpkCombustao ?? CPK_COMBUSTAO),
		custoCombustaoHipotetico: toNumber(row?.custoCombustaoHipotetico ?? 0),
		economiaTotal: toNumber(row?.economiaTotal ?? 0),
		totalRecargas: toInteger(row?.totalRecargas ?? 0),
		recargasGratuitas: toInteger(row?.recargasGratuitas ?? 0),
		percentualRecargasGratuitas: toNumber(row?.percentualRecargasGratuitas ?? 0),
	};
}

function mapVeiculo(row: EficienciaPorVeiculoRow): EficienciaEnergeticaPorVeiculo {
	return {
		veiculoId: row.veiculoId,
		nome: row.nome,
		placa: row.placa,
		totalKm: toNumber(row.totalKm),
		custoRealRecargas: toNumber(row.custoRealRecargas),
		cpkReal: toNumber(row.cpkReal),
		cpkCombustao: CPK_COMBUSTAO,
		custoCombustaoHipotetico: toNumber(row.custoCombustaoHipotetico),
		economiaTotal: toNumber(row.economiaTotal),
		totalRecargas: toInteger(row.totalRecargas),
		recargasGratuitas: toInteger(row.recargasGratuitas),
		percentualRecargasGratuitas: toNumber(row.percentualRecargasGratuitas),
	};
}

function mapFuncionario(row: EficienciaPorFuncionarioRow): EficienciaEnergeticaPorFuncionario {
	return {
		funcionarioId: row.funcionarioId,
		nome: row.nome,
		veiculosAtivos: toInteger(row.veiculosAtivos),
		totalKm: toNumber(row.totalKm),
		custoRealRecargas: toNumber(row.custoRealRecargas),
		cpkReal: toNumber(row.cpkReal),
		cpkCombustao: CPK_COMBUSTAO,
		custoCombustaoHipotetico: toNumber(row.custoCombustaoHipotetico),
		economiaTotal: toNumber(row.economiaTotal),
		totalRecargas: toInteger(row.totalRecargas),
		recargasGratuitas: toInteger(row.recargasGratuitas),
		percentualRecargasGratuitas: toNumber(row.percentualRecargasGratuitas),
	};
}

function mapResumoMensal(row: ResumoMensalExecutivoRow): DashboardExecutivoResumoMensal {
	const totalGastos = toNumber(row.totalGastos);
	const totalPrestacao = toNumber(row.totalPrestacao);
	const totalSeguro = toNumber(row.totalSeguro);
	const totalCustosFixos = totalPrestacao + totalSeguro;

	return {
		referenciaMes: row.referenciaMes,
		label: row.label,
		totalGanhos: toNumber(row.totalGanhos),
		totalGastos,
		saldo: toNumber(row.saldo),
		totalRecargas: toNumber(row.totalRecargas),
		totalPrestacao,
		totalSeguro,
		totalCustosFixos,
		percentualCustosFixosSobreGastos: totalGastos > 0 ? (totalCustosFixos / totalGastos) * 100 : 0,
	};
}

export async function getDashboardEficienciaEnergetica(params: {
	funcionarioId: number;
	periodoInicio: Date;
	periodoFim: Date;
	veiculoId?: number | null;
}): Promise<DashboardEficienciaEnergetica> {
	const { funcionarioId, periodoInicio, periodoFim, veiculoId = null } = params;
	const filtroVeiculoLancamento = veiculoId ? Prisma.sql`AND fl."veiculoId" = ${veiculoId}` : Prisma.empty;
	const filtroVeiculoCadastro = veiculoId ? Prisma.sql`AND v.id = ${veiculoId}` : Prisma.empty;

	const [resumoRows, porVeiculoRows] = await Promise.all([
		prisma.$queryRaw<ResumoEficienciaRow[]>(Prisma.sql`
			WITH lancamentos_filtrados AS (
				SELECT
					fl.categoria,
					fl.valor,
					fl."kmRodados"
				FROM "FuncionarioLancamento" fl
				WHERE fl."funcionarioId" = ${funcionarioId}
				  AND fl."dataReferencia" >= ${periodoInicio}
				  AND fl."dataReferencia" <= ${periodoFim}
				  ${filtroVeiculoLancamento}
			),
			base_km AS (
				SELECT COALESCE(SUM(COALESCE("kmRodados", 0)), 0) AS total_km
				FROM lancamentos_filtrados
			),
			base_recarga AS (
				SELECT
					COALESCE(SUM(valor), 0) AS custo_real_recargas,
					COUNT(*)::int AS total_recargas,
					COUNT(*) FILTER (WHERE valor = 0)::int AS recargas_gratuitas
				FROM lancamentos_filtrados
				WHERE categoria = 'RECARGA'
			)
			SELECT
				base_km.total_km AS "totalKm",
				base_recarga.custo_real_recargas AS "custoRealRecargas",
				base_recarga.total_recargas AS "totalRecargas",
				base_recarga.recargas_gratuitas AS "recargasGratuitas",
				CASE
					WHEN base_km.total_km > 0 THEN base_recarga.custo_real_recargas / base_km.total_km
					ELSE 0
				END AS "cpkReal",
				${CPK_COMBUSTAO}::numeric AS "cpkCombustao",
				base_km.total_km * ${CPK_COMBUSTAO}::numeric AS "custoCombustaoHipotetico",
				(base_km.total_km * ${CPK_COMBUSTAO}::numeric) - base_recarga.custo_real_recargas AS "economiaTotal",
				CASE
					WHEN base_recarga.total_recargas > 0 THEN (base_recarga.recargas_gratuitas::numeric / base_recarga.total_recargas::numeric) * 100
					ELSE 0
				END AS "percentualRecargasGratuitas"
			FROM base_km
			CROSS JOIN base_recarga
		`),
		prisma.$queryRaw<EficienciaPorVeiculoRow[]>(Prisma.sql`
			WITH lancamentos_filtrados AS (
				SELECT
					fl."veiculoId",
					fl.categoria,
					fl.valor,
					fl."kmRodados"
				FROM "FuncionarioLancamento" fl
				WHERE fl."funcionarioId" = ${funcionarioId}
				  AND fl."dataReferencia" >= ${periodoInicio}
				  AND fl."dataReferencia" <= ${periodoFim}
				  ${filtroVeiculoLancamento}
			)
			SELECT
				v.id AS "veiculoId",
				v.nome,
				v.placa,
				COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) AS "totalKm",
				COALESCE(SUM(CASE WHEN fl.categoria = 'RECARGA' THEN fl.valor ELSE 0 END), 0) AS "custoRealRecargas",
				COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA')::int AS "totalRecargas",
				COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA' AND fl.valor = 0)::int AS "recargasGratuitas",
				CASE
					WHEN COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) > 0
						THEN COALESCE(SUM(CASE WHEN fl.categoria = 'RECARGA' THEN fl.valor ELSE 0 END), 0)
							/ COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0)
					ELSE 0
				END AS "cpkReal",
				COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) * ${CPK_COMBUSTAO}::numeric AS "custoCombustaoHipotetico",
				(COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) * ${CPK_COMBUSTAO}::numeric)
					- COALESCE(SUM(CASE WHEN fl.categoria = 'RECARGA' THEN fl.valor ELSE 0 END), 0) AS "economiaTotal",
				CASE
					WHEN COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA') > 0
						THEN (
							COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA' AND fl.valor = 0)::numeric
							/ COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA')::numeric
						) * 100
					ELSE 0
				END AS "percentualRecargasGratuitas"
			FROM "Veiculo" v
			LEFT JOIN lancamentos_filtrados fl ON fl."veiculoId" = v.id
			WHERE v."funcionarioId" = ${funcionarioId}
			  ${filtroVeiculoCadastro}
			GROUP BY v.id, v.nome, v.placa, v."createdAt"
			ORDER BY v."createdAt" ASC
		`),
	]);

	return {
		periodoInicio: periodoInicio.toISOString(),
		periodoFim: periodoFim.toISOString(),
		veiculoId,
		parametrosCombustao: {
			kmPorLitro: KM_POR_LITRO_COMBUSTAO,
			precoLitro: PRECO_LITRO_COMBUSTAO,
			cpk: CPK_COMBUSTAO,
		},
		resumo: mapResumo(resumoRows[0]),
		porVeiculo: porVeiculoRows.map(mapVeiculo),
	};
}

export async function getDashboardExecutivoEmpresa(params: {
	empresa: string;
	period: "day" | "week" | "month" | "custom";
	periodoInicio: Date;
	periodoFim: Date;
}): Promise<DashboardExecutivoEmpresa> {
	const { empresa, period, periodoInicio, periodoFim } = params;

	const [resumoRows, porVeiculoRows, porFuncionarioRows, resumoMensalRows] = await Promise.all([
		prisma.$queryRaw<ResumoEficienciaRow[]>(Prisma.sql`
			WITH lancamentos_filtrados AS (
				SELECT fl.categoria, fl.valor, fl."kmRodados"
				FROM "FuncionarioLancamento" fl
				WHERE fl."dataReferencia" >= ${periodoInicio}
				  AND fl."dataReferencia" <= ${periodoFim}
			),
			base_km AS (
				SELECT COALESCE(SUM(COALESCE("kmRodados", 0)), 0) AS total_km
				FROM lancamentos_filtrados
			),
			base_recarga AS (
				SELECT
					COALESCE(SUM(valor), 0) AS custo_real_recargas,
					COUNT(*)::int AS total_recargas,
					COUNT(*) FILTER (WHERE valor = 0)::int AS recargas_gratuitas
				FROM lancamentos_filtrados
				WHERE categoria = 'RECARGA'
			)
			SELECT
				base_km.total_km AS "totalKm",
				base_recarga.custo_real_recargas AS "custoRealRecargas",
				base_recarga.total_recargas AS "totalRecargas",
				base_recarga.recargas_gratuitas AS "recargasGratuitas",
				CASE WHEN base_km.total_km > 0 THEN base_recarga.custo_real_recargas / base_km.total_km ELSE 0 END AS "cpkReal",
				${CPK_COMBUSTAO}::numeric AS "cpkCombustao",
				base_km.total_km * ${CPK_COMBUSTAO}::numeric AS "custoCombustaoHipotetico",
				(base_km.total_km * ${CPK_COMBUSTAO}::numeric) - base_recarga.custo_real_recargas AS "economiaTotal",
				CASE WHEN base_recarga.total_recargas > 0 THEN (base_recarga.recargas_gratuitas::numeric / base_recarga.total_recargas::numeric) * 100 ELSE 0 END AS "percentualRecargasGratuitas"
			FROM base_km
			CROSS JOIN base_recarga
		`),
		prisma.$queryRaw<EficienciaPorVeiculoRow[]>(Prisma.sql`
			WITH lancamentos_filtrados AS (
				SELECT fl."veiculoId", fl.categoria, fl.valor, fl."kmRodados"
				FROM "FuncionarioLancamento" fl
				WHERE fl."dataReferencia" >= ${periodoInicio}
				  AND fl."dataReferencia" <= ${periodoFim}
			)
			SELECT
				v.id AS "veiculoId",
				v.nome,
				v.placa,
				COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) AS "totalKm",
				COALESCE(SUM(CASE WHEN fl.categoria = 'RECARGA' THEN fl.valor ELSE 0 END), 0) AS "custoRealRecargas",
				COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA')::int AS "totalRecargas",
				COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA' AND fl.valor = 0)::int AS "recargasGratuitas",
				CASE WHEN COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) > 0 THEN COALESCE(SUM(CASE WHEN fl.categoria = 'RECARGA' THEN fl.valor ELSE 0 END), 0) / COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) ELSE 0 END AS "cpkReal",
				COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) * ${CPK_COMBUSTAO}::numeric AS "custoCombustaoHipotetico",
				(COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) * ${CPK_COMBUSTAO}::numeric) - COALESCE(SUM(CASE WHEN fl.categoria = 'RECARGA' THEN fl.valor ELSE 0 END), 0) AS "economiaTotal",
				CASE WHEN COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA') > 0 THEN (COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA' AND fl.valor = 0)::numeric / COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA')::numeric) * 100 ELSE 0 END AS "percentualRecargasGratuitas"
			FROM "Veiculo" v
			LEFT JOIN lancamentos_filtrados fl ON fl."veiculoId" = v.id
			GROUP BY v.id, v.nome, v.placa, v."createdAt"
			ORDER BY v."createdAt" ASC
		`),
		prisma.$queryRaw<EficienciaPorFuncionarioRow[]>(Prisma.sql`
			WITH lancamentos_filtrados AS (
				SELECT fl."funcionarioId", fl."veiculoId", fl.categoria, fl.valor, fl."kmRodados"
				FROM "FuncionarioLancamento" fl
				WHERE fl."dataReferencia" >= ${periodoInicio}
				  AND fl."dataReferencia" <= ${periodoFim}
			)
			SELECT
				f.id AS "funcionarioId",
				f.name AS nome,
				COUNT(DISTINCT fl."veiculoId")::int AS "veiculosAtivos",
				COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) AS "totalKm",
				COALESCE(SUM(CASE WHEN fl.categoria = 'RECARGA' THEN fl.valor ELSE 0 END), 0) AS "custoRealRecargas",
				COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA')::int AS "totalRecargas",
				COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA' AND fl.valor = 0)::int AS "recargasGratuitas",
				CASE WHEN COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) > 0 THEN COALESCE(SUM(CASE WHEN fl.categoria = 'RECARGA' THEN fl.valor ELSE 0 END), 0) / COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) ELSE 0 END AS "cpkReal",
				COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) * ${CPK_COMBUSTAO}::numeric AS "custoCombustaoHipotetico",
				(COALESCE(SUM(COALESCE(fl."kmRodados", 0)), 0) * ${CPK_COMBUSTAO}::numeric) - COALESCE(SUM(CASE WHEN fl.categoria = 'RECARGA' THEN fl.valor ELSE 0 END), 0) AS "economiaTotal",
				CASE WHEN COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA') > 0 THEN (COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA' AND fl.valor = 0)::numeric / COUNT(*) FILTER (WHERE fl.categoria = 'RECARGA')::numeric) * 100 ELSE 0 END AS "percentualRecargasGratuitas"
			FROM "Funcionario" f
			LEFT JOIN lancamentos_filtrados fl ON fl."funcionarioId" = f.id
			GROUP BY f.id, f.name, f."createdAt"
			ORDER BY "economiaTotal" DESC, f."createdAt" ASC
		`),
		prisma.$queryRaw<ResumoMensalExecutivoRow[]>(Prisma.sql`
			SELECT
				TO_CHAR(DATE_TRUNC('month', fl."dataReferencia"), 'YYYY-MM') AS "referenciaMes",
				TO_CHAR(DATE_TRUNC('month', fl."dataReferencia"), 'MM/YYYY') AS label,
				COALESCE(SUM(CASE WHEN fl.tipo = 'GANHO' THEN fl.valor ELSE 0 END), 0) AS "totalGanhos",
				COALESCE(SUM(CASE WHEN fl.tipo = 'GASTO' THEN fl.valor ELSE 0 END), 0) AS "totalGastos",
				COALESCE(SUM(CASE WHEN fl.tipo = 'GANHO' THEN fl.valor ELSE -fl.valor END), 0) AS saldo,
				COALESCE(SUM(CASE WHEN fl.categoria = 'RECARGA' THEN fl.valor ELSE 0 END), 0) AS "totalRecargas",
				COALESCE(SUM(CASE WHEN fl.categoria = 'PRESTACAO' THEN fl.valor ELSE 0 END), 0) AS "totalPrestacao",
				COALESCE(SUM(CASE WHEN fl.categoria = 'SEGURO' THEN fl.valor ELSE 0 END), 0) AS "totalSeguro"
			FROM "FuncionarioLancamento" fl
			WHERE fl."dataReferencia" >= ${periodoInicio}
			  AND fl."dataReferencia" <= ${periodoFim}
			GROUP BY DATE_TRUNC('month', fl."dataReferencia")
			ORDER BY DATE_TRUNC('month', fl."dataReferencia") DESC
		`),
	]);

	const porVeiculo = porVeiculoRows.map(mapVeiculo);
	const porFuncionario = porFuncionarioRows.map(mapFuncionario);
	const resumoMensal = resumoMensalRows.map(mapResumoMensal);

	return {
		empresa,
		periodo: period,
		periodoInicio: periodoInicio.toISOString(),
		periodoFim: periodoFim.toISOString(),
		parametrosCombustao: {
			kmPorLitro: KM_POR_LITRO_COMBUSTAO,
			precoLitro: PRECO_LITRO_COMBUSTAO,
			cpk: CPK_COMBUSTAO,
		},
		resumo: mapResumo(resumoRows[0]),
		totais: {
			funcionariosAtivos: porFuncionario.filter((item) => item.totalKm > 0 || item.totalRecargas > 0).length,
			veiculosAtivos: porVeiculo.filter((item) => item.totalKm > 0 || item.totalRecargas > 0).length,
		},
		resumoMensal,
		porFuncionario,
		porVeiculo,
	};
}