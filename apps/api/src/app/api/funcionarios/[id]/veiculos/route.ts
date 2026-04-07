import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookies, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { session, response } = await requireAuth(request);
	if (response || !session) {
		return response;
	}

	const { id } = await context.params;
	const funcionarioId = Number(id);

	if (!Number.isInteger(funcionarioId) || funcionarioId <= 0) {
		return NextResponse.json({ error: "Funcionário inválido." }, { status: 400 });
	}

	const funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
	if (!funcionario) {
		return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });
	}

	const body = (await request.json()) as {
		nome?: string;
		placa?: string;
	};

	const nome = body.nome?.trim() ?? "";
	const placa = body.placa?.trim() || null;

	if (!nome) {
		return NextResponse.json({ error: "Nome do veículo é obrigatório." }, { status: 400 });
	}

	const veiculo = await prisma.veiculo.create({
		data: {
			funcionarioId,
			nome,
			placa,
			eletrico: true,
		},
	});

	const payload = NextResponse.json({
		veiculo: {
			id: veiculo.id,
			nome: veiculo.nome,
			placa: veiculo.placa,
			eletrico: veiculo.eletrico,
			createdAt: veiculo.createdAt.toISOString(),
		},
	});

	return attachSessionCookies(payload, {
		sessionId: session.session.id,
		user: session.session.user,
	});
}
