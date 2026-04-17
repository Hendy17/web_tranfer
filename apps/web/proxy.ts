import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, verifyAccessToken } from "./app/lib/auth";

const protectedPrefixes = ["/dashboard", "/funcionarios"];
const guestOnlyRoutes = ["/auth/login", "/auth/register"];
const publicRoutes = ["/funcionarios/login"];

function matchesPublicRoute(pathname: string) {
	return publicRoutes.includes(pathname);
}

function matchesProtectedPath(pathname: string) {
	if (matchesPublicRoute(pathname)) {
		return false;
	}

	return protectedPrefixes.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

function matchesGuestOnlyRoute(pathname: string) {
	return guestOnlyRoutes.includes(pathname);
}

function clearAuthCookies(response: NextResponse) {
	response.cookies.set(ACCESS_COOKIE_NAME, "", {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 0,
	});
	response.cookies.set(REFRESH_COOKIE_NAME, "", {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 0,
	});
	return response;
}

export async function proxy(request: NextRequest) {
	const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
	const session = await verifyAccessToken(accessToken);
	const { pathname } = request.nextUrl;

	if (matchesProtectedPath(pathname) && !session) {
		const loginUrl = new URL("/auth/login", request.url);
		loginUrl.searchParams.set(
			"redirect",
			`${pathname}${request.nextUrl.search}`,
		);
		return clearAuthCookies(NextResponse.redirect(loginUrl));
	}

	if (matchesGuestOnlyRoute(pathname) && session) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard/:path*", "/funcionarios/:path*", "/auth/login", "/auth/register"],
};