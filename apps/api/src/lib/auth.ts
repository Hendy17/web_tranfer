import { randomBytes, createHash } from "crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const ACCESS_COOKIE_NAME = "transfer_web_access";
export const REFRESH_COOKIE_NAME = "transfer_web_refresh";

const ACCESS_TOKEN_MAX_AGE = 60 * 15;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

export interface AuthSessionPayload extends JWTPayload {
	sessionId: string;
	userId: number;
	email: string;
	name: string | null;
}

const sessionSecret = new TextEncoder().encode(
	process.env.AUTH_SESSION_SECRET || "dev-only-change-me",
);

const accessCookieOptions = {
	httpOnly: true,
	sameSite: "lax" as const,
	secure: process.env.NODE_ENV === "production",
	path: "/",
	maxAge: ACCESS_TOKEN_MAX_AGE,
};

const refreshCookieOptions = {
	...accessCookieOptions,
	maxAge: REFRESH_TOKEN_MAX_AGE,
};

function hashRefreshToken(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

function generateRefreshToken() {
	return randomBytes(48).toString("hex");
}

async function signAccessToken(session: Omit<AuthSessionPayload, keyof JWTPayload>) {
	return new SignJWT(session)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(`${ACCESS_TOKEN_MAX_AGE}s`)
		.sign(sessionSecret);
}

async function setAccessCookie(
	response: NextResponse,
	session: Omit<AuthSessionPayload, keyof JWTPayload>,
) {
	const token = await signAccessToken(session);
	response.cookies.set(ACCESS_COOKIE_NAME, token, accessCookieOptions);
	return response;
}

function setRefreshCookie(response: NextResponse, refreshToken: string) {
	response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
	return response;
}

export function clearAuthCookie(response: NextResponse) {
	response.cookies.set(ACCESS_COOKIE_NAME, "", {
		...accessCookieOptions,
		maxAge: 0,
	});
	response.cookies.set(REFRESH_COOKIE_NAME, "", {
		...refreshCookieOptions,
		maxAge: 0,
	});
	return response;
}

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

async function findActiveSessionById(sessionId: string) {
	return prisma.session.findUnique({
		where: { id: sessionId },
		include: { user: true },
	});
}

function isSessionUsable(session: { expiresAt: Date; revokedAt: Date | null }) {
	return !session.revokedAt && session.expiresAt.getTime() > Date.now();
}

export async function createPersistentSession(
	response: NextResponse,
	user: { id: number; email: string; name: string | null },
) {
	const refreshToken = generateRefreshToken();
	const refreshTokenHash = hashRefreshToken(refreshToken);
	const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);

	const session = await prisma.session.create({
		data: {
			userId: user.id,
			refreshTokenHash,
			expiresAt,
		},
	});

	await setAccessCookie(response, {
		sessionId: session.id,
		userId: user.id,
		email: user.email,
		name: user.name,
	});
	setRefreshCookie(response, refreshToken);

	return response;
}

async function revokeSession(sessionId: string) {
	await prisma.session.updateMany({
		where: { id: sessionId, revokedAt: null },
		data: { revokedAt: new Date() },
	});
}

export async function revokeSessionFromRequest(request: NextRequest) {
	const accessPayload = await verifyAccessToken(request.cookies.get(ACCESS_COOKIE_NAME)?.value);
	if (accessPayload?.sessionId) {
		await revokeSession(accessPayload.sessionId);
		return;
	}

	const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
	if (!refreshToken) {
		return;
	}

	await prisma.session.updateMany({
		where: { refreshTokenHash: hashRefreshToken(refreshToken), revokedAt: null },
		data: { revokedAt: new Date() },
	});
}

export async function readAuthSession(request: NextRequest) {
	const payload = await verifyAccessToken(request.cookies.get(ACCESS_COOKIE_NAME)?.value);
	if (!payload?.sessionId) {
		return null;
	}

	const session = await findActiveSessionById(payload.sessionId);
	if (!session || !isSessionUsable(session)) {
		return null;
	}

	await prisma.session.update({
		where: { id: session.id },
		data: { lastUsedAt: new Date() },
	});

	return {
		payload,
		session,
	};
}

export function serializeSession(session: { payload: AuthSessionPayload; session: { expiresAt: Date } }) {
	return {
		id: session.payload.userId,
		email: session.payload.email,
		name: session.payload.name,
		expiresAt: session.session.expiresAt.getTime(),
	};
}

export async function rotateRefreshSession(request: NextRequest) {
	const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
	if (!refreshToken) {
		return null;
	}

	const currentSession = await prisma.session.findUnique({
		where: { refreshTokenHash: hashRefreshToken(refreshToken) },
		include: { user: true },
	});

	if (!currentSession || !isSessionUsable(currentSession)) {
		return null;
	}

	const nextRefreshToken = generateRefreshToken();
	const nextRefreshTokenHash = hashRefreshToken(nextRefreshToken);
	const nextExpiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);

	const rotatedSession = await prisma.$transaction(async (transaction) => {
		const replacement = await transaction.session.create({
			data: {
				userId: currentSession.userId,
				refreshTokenHash: nextRefreshTokenHash,
				expiresAt: nextExpiresAt,
			},
		});

		await transaction.session.update({
			where: { id: currentSession.id },
			data: {
				revokedAt: new Date(),
				replacedById: replacement.id,
				lastUsedAt: new Date(),
			},
		});

		return replacement;
	});

	return {
		refreshToken: nextRefreshToken,
		session: rotatedSession,
		user: currentSession.user,
	};
}

export async function attachSessionCookies(
	response: NextResponse,
	data: {
		sessionId: string;
		user: { id: number; email: string; name: string | null };
		refreshToken?: string;
	},
) {
	await setAccessCookie(response, {
		sessionId: data.sessionId,
		userId: data.user.id,
		email: data.user.email,
		name: data.user.name,
	});

	if (data.refreshToken) {
		setRefreshCookie(response, data.refreshToken);
	}

	return response;
}

export async function requireAuth(request: NextRequest) {
	const session = await readAuthSession(request);
	if (session) {
		return { session, response: null };
	}

	const response = NextResponse.json({ error: "Não autenticado." }, { status: 401 });
	clearAuthCookie(response);
	return { session: null, response };
}