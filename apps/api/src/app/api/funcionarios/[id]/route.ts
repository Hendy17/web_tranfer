import { NextRequest, NextResponse } from "next/server";
import type { DashboardEficienciaEnergetica, DashboardPeriodFilter } from "common-types";
import { attachSessionCookies, requireAuth } from "@/lib/auth";
import { parseDashboardDateRange } from "@/lib/date-range";
import { getDashboardEficienciaEnergetica } from "@/lib/energy-efficiency";
import { prisma } from "@/lib/prisma";
import type { PrismaLancamentoCategoria } from "@/lib/prisma";

const validCategories = new Set([
	"UBER",
	"N99",
	"BLABLACAR",
	"TRANSFER",
	"PARTICULAR",
	"RECARGA",
	"PEDAGIOS",
	"PRESTACAO",
	"SEGURO",
	"LIMPEZA",
	"REVISAO",
	"MANUTENCAO",
]);

function toNumber(value: { toString(): string } | null | undefined) {
	return value ? Number(value.toString()) : 0;
}

function readBateriaConsumidaPercentual(value: unknown) {
	if (!value || typeof value !== "object" || !("bateriaConsumidaPercentual" in value)) {
		return null;
	}

	const bateriaConsumidaPercentual = (value as { bateriaConsumidaPercentual: { toString(): string } | null }).bateriaConsumidaPercentual;
	return bateriaConsumidaPercentual ? toNumber(bateriaConsumidaPercentual) : null;
}

function formatResumo(lancamentos: Array<{ tipo: "GANHO" | "GASTO"; valor: { toString(): string }; kmRodados: { toString(): string } | null }>) {
	const resumo = lancamentos.reduce(
		(acc, lancamento) => {
			const valor = toNumber(lancamento.valor);
			const kmRodados = toNumber(lancamento.kmRodados);

			if (lancamento.tipo === "GANHO") {
				acc.totalGanhos += valor;
			} else {
				acc.totalGastos += valor;
			}

			acc.totalKm += kmRodados;
			return acc;
		},
		{ totalGanhos: 0, totalGastos: 0, totalKm: 0 },
	);

	return {
		totalGanhos: resumo.totalGanhos,
		totalGastos: resumo.totalGastos,
		saldo: resumo.totalGanhos - resumo.totalGastos,
		totalKm: resumo.totalKm,
		custoPorKm: resumo.totalKm > 0 ? resumo.totalGastos / resumo.totalKm : 0,
		ganhoPorKm: resumo.totalKm > 0 ? resumo.totalGanhos / resumo.totalKm : 0,
	};
}

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { session, response } = await requireAuth(request);
	if (response || !session) {
		return response;
	}

	const { id } = await context.params;
	const funcionarioId = Number(id);
	let parsedRange;
	try {
		parsedRange = parseDashboardDateRange(request.nextUrl.searchParams);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Período inválido.";
		return NextResponse.json({ error: message }, { status: 400 });
	}

	const period = parsedRange.period;
	const veiculoIdParam = request.nextUrl.searchParams.get("veiculoId");
	const veiculoId = veiculoIdParam ? Number(veiculoIdParam) : null;
	const categoriesParam = request.nextUrl.searchParams.get("categories") ?? "";
	const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
	const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? "8");
	const categories = categoriesParam
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);

	if (!Number.isInteger(funcionarioId) || funcionarioId <= 0) {
		return NextResponse.json({ error: "Funcionário inválido." }, { status: 400 });
	}

	if (veiculoIdParam && (!Number.isInteger(veiculoId) || (veiculoId ?? 0) <= 0)) {
		return NextResponse.json({ error: "Veículo inválido." }, { status: 400 });
	}

	if (!Number.isInteger(page) || page <= 0 || !Number.isInteger(pageSize) || pageSize <= 0 || pageSize > 100) {
		return NextResponse.json({ error: "Paginação inválida." }, { status: 400 });
	}

	if (categories.some((category) => !validCategories.has(category))) {
		return NextResponse.json({ error: "Categoria inválida no filtro." }, { status: 400 });
	}

	const categoriasFiltradas = categories as PrismaLancamentoCategoria[];

	const { start, end } = parsedRange;

	const funcionario = await prisma.funcionario.findUnique({
		where: { id: funcionarioId },
		include: {
			veiculos: {
				orderBy: { createdAt: "asc" },
			},
			lancamentos: {
				where: {
					dataReferencia: {
						gte: start,
						lte: end,
					},
					...(veiculoId ? { veiculoId } : {}),
					...(categoriasFiltradas.length > 0 ? { categoria: { in: categoriasFiltradas } } : {}),
				},
				include: {
					veiculo: true,
				},
				orderBy: [{ dataReferencia: "desc" }, { createdAt: "desc" }],
			},
		},
	});

	if (!funcionario) {
		return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });
	}

	const eficienciaEnergetica: DashboardEficienciaEnergetica = await getDashboardEficienciaEnergetica({
		funcionarioId,
		periodoInicio: start,
		periodoFim: end,
		veiculoId,
	});

	const resumo = formatResumo(funcionario.lancamentos);
	const totalItems = funcionario.lancamentos.length;
	const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / pageSize);
	const currentPage = Math.min(page, totalPages);
	const startIndex = (currentPage - 1) * pageSize;
	const paginatedLancamentos = funcionario.lancamentos.slice(startIndex, startIndex + pageSize);
	const resumoPorVeiculo = funcionario.veiculos.map((veiculo) => {
		const lancamentos = funcionario.lancamentos.filter((item) => item.veiculoId === veiculo.id);
		return {
			veiculoId: veiculo.id,
			nome: veiculo.nome,
			placa: veiculo.placa,
			resumo: formatResumo(lancamentos),
		};
	});

	const payload = NextResponse.json({
		funcionario: {
			id: funcionario.id,
			name: funcionario.name,
			createdAt: funcionario.createdAt.toISOString(),
		},
		filtros: {
			period: period as DashboardPeriodFilter,
			periodStart: start.toISOString(),
			periodEnd: end.toISOString(),
			veiculoId,
			categories: categoriasFiltradas,
		},
		pagination: {
			page: currentPage,
			pageSize,
			totalItems,
			totalPages,
		},
		veiculos: funcionario.veiculos.map((veiculo) => ({
			id: veiculo.id,
			nome: veiculo.nome,
			placa: veiculo.placa,
			eletrico: veiculo.eletrico,
			createdAt: veiculo.createdAt.toISOString(),
		})),
		eficienciaEnergetica,
		resumo,
		resumoPorVeiculo,
		lancamentos: paginatedLancamentos.map((lancamento) => ({
			id: lancamento.id,
			tipo: lancamento.tipo,
			categoria: lancamento.categoria,
			valor: toNumber(lancamento.valor),
			kmRodados: lancamento.kmRodados ? toNumber(lancamento.kmRodados) : null,
			bateriaConsumidaPercentual: readBateriaConsumidaPercentual(lancamento),
			observacao: lancamento.observacao,
			dataReferencia: lancamento.dataReferencia.toISOString(),
			createdAt: lancamento.createdAt.toISOString(),
			veiculo: lancamento.veiculo
				? {
					id: lancamento.veiculo.id,
					nome: lancamento.veiculo.nome,
					placa: lancamento.veiculo.placa,
				}
				: null,
		})),
	});

	return attachSessionCookies(payload, {
		sessionId: session.session.id,
		user: session.session.user,
	});
}
