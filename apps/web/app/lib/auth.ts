import { jwtVerify, type JWTPayload } from "jose";

export const ACCESS_COOKIE_NAME = "transfer_web_access";
export const REFRESH_COOKIE_NAME = "transfer_web_refresh";

export interface AuthSessionPayload extends JWTPayload {
	sessionId: string;
	userId: number;
	email: string;
	name: string | null;
}

export interface AuthSessionView {
	id: number;
	email: string;
	name: string | null;
	expiresAt: number | null;
}

const sessionSecret = new TextEncoder().encode(
	process.env.AUTH_SESSION_SECRET || "dev-only-change-me",
);

export async function verifyAccessToken(token?: string) {
	if (!token) {
		return null;
	}

	try {
		const { payload } = await jwtVerify(token, sessionSecret);
		return payload as AuthSessionPayload;
	} catch {
		return null;
	}
}

export function formatSessionRemaining(expiresAt: number | null) {
	if (!expiresAt) {
		return "Sessão sem expiração informada";
	}

	const remainingMs = expiresAt - Date.now();
	if (remainingMs <= 0) {
		return "Sessão expirada";
	}

	const totalMinutes = Math.floor(remainingMs / 60000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (hours > 0) {
		return `Sessão expira em ${hours}h ${minutes}min`;
	}

	return `Sessão expira em ${minutes}min`;
}