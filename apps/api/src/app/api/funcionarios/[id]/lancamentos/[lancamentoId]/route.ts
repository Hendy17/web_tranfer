import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookies, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PrismaLancamentoCategoria } from "@/lib/prisma";

type LancamentoTipo = "GANHO" | "GASTO";
type LancamentoCategoria =
	| "UBER"
	| "N99"
	| "BLABLACAR"
	| "TRANSFER"
	| "PARTICULAR"
	| "RECARGA"
	| "PEDAGIOS"
	| "LIMPEZA"
	| "REVISAO"
	| "MANUTENCAO";

const ganhoCategorias = new Set(["UBER", "N99", "BLABLACAR", "TRANSFER", "PARTICULAR"]);
const gastoCategorias = new Set(["RECARGA", "PEDAGIOS", "LIMPEZA", "REVISAO", "MANUTENCAO"]);

function isValidDate(value: string) {
	return !Number.isNaN(Date.parse(value));
}

async function validateRequest(request: NextRequest, funcionarioId: number) {
	const body = (await request.json()) as {
		tipo?: string;
		categoria?: string;
		veiculoId?: number;
		valor?: number;
		kmRodados?: number | null;
		observacao?: string;
		dataReferencia?: string;
	};

	const tipo = body.tipo === "GANHO" || body.tipo === "GASTO" ? body.tipo : null;
	const categoria = body.categoria ?? "";
	const veiculoId = Number(body.veiculoId);
	const valor = Number(body.valor);
	const kmRodados = body.kmRodados == null || body.kmRodados === 0 ? null : Number(body.kmRodados);
	const observacao = body.observacao?.trim() || null;
	const dataReferencia = body.dataReferencia ?? "";

	if (!tipo) {
		return { error: NextResponse.json({ error: "Tipo de lançamento inválido." }, { status: 400 }) };
	}
	const categoriaValida = tipo === "GANHO" ? ganhoCategorias.has(categoria) : gastoCategorias.has(categoria);
	if (!categoriaValida) {
		return { error: NextResponse.json({ error: "Categoria incompatível com o tipo selecionado." }, { status: 400 }) };
	}
	if (!Number.isFinite(valor) || valor <= 0) {
		return { error: NextResponse.json({ error: "Valor deve ser maior que zero." }, { status: 400 }) };
	}
	if (!Number.isInteger(veiculoId) || veiculoId <= 0) {
		return { error: NextResponse.json({ error: "Selecione o veículo utilizado." }, { status: 400 }) };
	}
	const veiculo = await prisma.veiculo.findFirst({ where: { id: veiculoId, funcionarioId } });
	if (!veiculo) {
		return { error: NextResponse.json({ error: "Veículo não encontrado para este funcionário." }, { status: 404 }) };
	}
	if (kmRodados != null && (!Number.isFinite(kmRodados) || kmRodados < 0)) {
		return { error: NextResponse.json({ error: "KM rodados inválidos." }, { status: 400 }) };
	}
	if (!isValidDate(dataReferencia)) {
		return { error: NextResponse.json({ error: "Data de referência inválida." }, { status: 400 }) };
	}

	return {
		data: {
			veiculoId,
			tipo: tipo as LancamentoTipo,
			categoria: categoria as PrismaLancamentoCategoria,
			valor,
			kmRodados,
			observacao,
			dataReferencia: new Date(dataReferencia),
		},
	};
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string; lancamentoId: string }> }) {
	const { session, response } = await requireAuth(request);
	if (response || !session) {
		return response;
	}

	const { id, lancamentoId } = await context.params;
	const funcionarioId = Number(id);
	const lancamentoIdNumber = Number(lancamentoId);

	if (!Number.isInteger(funcionarioId) || funcionarioId <= 0 || !Number.isInteger(lancamentoIdNumber) || lancamentoIdNumber <= 0) {
		return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
	}

	const lancamentoAtual = await prisma.funcionarioLancamento.findFirst({ where: { id: lancamentoIdNumber, funcionarioId } });
	if (!lancamentoAtual) {
		return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
	}

	const parsed = await validateRequest(request, funcionarioId);
	if ("error" in parsed) {
		return parsed.error;
	}

	const lancamento = await prisma.funcionarioLancamento.update({
		where: { id: lancamentoIdNumber },
		data: parsed.data,
	});

	const payload = NextResponse.json({
		lancamento: {
			id: lancamento.id,
			veiculoId: lancamento.veiculoId,
			tipo: lancamento.tipo,
			categoria: lancamento.categoria,
			valor: Number(lancamento.valor.toString()),
			kmRodados: lancamento.kmRodados ? Number(lancamento.kmRodados.toString()) : null,
			observacao: lancamento.observacao,
			dataReferencia: lancamento.dataReferencia.toISOString(),
			createdAt: lancamento.createdAt.toISOString(),
		},
	});

	return attachSessionCookies(payload, { sessionId: session.session.id, user: session.session.user });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; lancamentoId: string }> }) {
	const { session, response } = await requireAuth(request);
	if (response || !session) {
		return response;
	}

	const { id, lancamentoId } = await context.params;
	const funcionarioId = Number(id);
	const lancamentoIdNumber = Number(lancamentoId);

	if (!Number.isInteger(funcionarioId) || funcionarioId <= 0 || !Number.isInteger(lancamentoIdNumber) || lancamentoIdNumber <= 0) {
		return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
	}

	const lancamentoAtual = await prisma.funcionarioLancamento.findFirst({ where: { id: lancamentoIdNumber, funcionarioId } });
	if (!lancamentoAtual) {
		return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
	}

	await prisma.funcionarioLancamento.delete({ where: { id: lancamentoIdNumber } });
	const payload = NextResponse.json({ success: true });
	return attachSessionCookies(payload, { sessionId: session.session.id, user: session.session.user });
}
