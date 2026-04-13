import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookies, requireAuth } from "@/lib/auth";
import { LancamentoCategoria, prisma } from "@/lib/prisma";

const validCategories = new Set<LancamentoCategoria>([
	LancamentoCategoria.UBER,
	LancamentoCategoria.N99,
	LancamentoCategoria.BLABLACAR,
	LancamentoCategoria.TRANSFER,
	LancamentoCategoria.PARTICULAR,
	LancamentoCategoria.RECARGA,
	LancamentoCategoria.PEDAGIOS,
	LancamentoCategoria.LIMPEZA,
	LancamentoCategoria.REVISAO,
	LancamentoCategoria.MANUTENCAO,
]);

function toNumber(value: { toString(): string } | null | undefined) {
	return value ? Number(value.toString()) : 0;
}

function getPeriodRange(period: string) {
	const now = new Date();
	const end = new Date(now);
	const start = new Date(now);

	if (period === "day") {
		start.setHours(0, 0, 0, 0);
		end.setHours(23, 59, 59, 999);
		return { start, end };
	}

	if (period === "week") {
		const day = now.getDay();
		const diff = day === 0 ? -6 : 1 - day;
		start.setDate(now.getDate() + diff);
		start.setHours(0, 0, 0, 0);
		end.setDate(start.getDate() + 6);
		end.setHours(23, 59, 59, 999);
		return { start, end };
	}

	start.setDate(1);
	start.setHours(0, 0, 0, 0);
	end.setMonth(now.getMonth() + 1, 0);
	end.setHours(23, 59, 59, 999);
	return { start, end };
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
	const period = request.nextUrl.searchParams.get("period") ?? "month";
	const veiculoIdParam = request.nextUrl.searchParams.get("veiculoId");
	const veiculoId = veiculoIdParam ? Number(veiculoIdParam) : null;
	const categoriesParam = request.nextUrl.searchParams.get("categories") ?? "";
	const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
	const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? "8");
	const categories = categoriesParam
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean) as LancamentoCategoria[];

	if (!Number.isInteger(funcionarioId) || funcionarioId <= 0) {
		return NextResponse.json({ error: "Funcionário inválido." }, { status: 400 });
	}

	if (!["day", "week", "month"].includes(period)) {
		return NextResponse.json({ error: "Período inválido." }, { status: 400 });
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

	const { start, end } = getPeriodRange(period);

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
					...(categories.length > 0 ? { categoria: { in: categories } } : {}),
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
			period,
			periodStart: start.toISOString(),
			periodEnd: end.toISOString(),
			veiculoId,
			categories,
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
		resumo,
		resumoPorVeiculo,
		lancamentos: paginatedLancamentos.map((lancamento) => ({
			id: lancamento.id,
			tipo: lancamento.tipo,
			categoria: lancamento.categoria,
			valor: toNumber(lancamento.valor),
			kmRodados: lancamento.kmRodados ? toNumber(lancamento.kmRodados) : null,
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
