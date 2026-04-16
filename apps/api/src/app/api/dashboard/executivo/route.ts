import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookies, requireAuth } from "@/lib/auth";
import { parseDashboardDateRange } from "@/lib/date-range";
import { getDashboardExecutivoEmpresa } from "@/lib/energy-efficiency";

const EMPRESA_ATUAL = "Transfer Executivo Premium";

export async function GET(request: NextRequest) {
	const { session, response } = await requireAuth(request);
	if (response || !session) {
		return response;
	}

	let parsedRange;
	try {
		parsedRange = parseDashboardDateRange(request.nextUrl.searchParams);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Período inválido.";
		return NextResponse.json({ error: message }, { status: 400 });
	}

	const dashboard = await getDashboardExecutivoEmpresa({
		empresa: EMPRESA_ATUAL,
		period: parsedRange.period,
		periodoInicio: parsedRange.start,
		periodoFim: parsedRange.end,
	});

	const payload = NextResponse.json(dashboard);
	return attachSessionCookies(payload, {
		sessionId: session.session.id,
		user: session.session.user,
	});
}