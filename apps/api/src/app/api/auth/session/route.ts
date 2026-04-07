import { NextRequest, NextResponse } from "next/server";
import {
	attachSessionCookies,
	clearAuthCookie,
	requireAuth,
	rotateRefreshSession,
	serializeSession,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
	const { session, response } = await requireAuth(request);
	if (session) {
		const sessionResponse = NextResponse.json({
			session: serializeSession(session),
		});

		return attachSessionCookies(sessionResponse, {
			sessionId: session.session.id,
			user: session.session.user,
		});
	}

	if (response) {
		const refreshed = await rotateRefreshSession(request);
		if (!refreshed) {
			return clearAuthCookie(response);
		}

		const refreshedResponse = NextResponse.json({
			session: {
				id: refreshed.user.id,
				email: refreshed.user.email,
				name: refreshed.user.name,
				expiresAt: refreshed.session.expiresAt.getTime(),
			},
		});

		return attachSessionCookies(refreshedResponse, {
			sessionId: refreshed.session.id,
			user: refreshed.user,
			refreshToken: refreshed.refreshToken,
		});
	}

	return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
}