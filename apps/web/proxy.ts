import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, verifyAccessToken } from "./app/lib/auth";

const protectedPrefixes = ["/dashboard", "/funcionarios"];
const guestOnlyRoutes = ["/auth/login", "/auth/register"];

function matchesProtectedPath(pathname: string) {
	return protectedPrefixes.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

function matchesGuestOnlyRoute(pathname: string) {
	return guestOnlyRoutes.includes(pathname);
}

export async function proxy(request: NextRequest) {
	const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
	const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
	const session = await verifyAccessToken(accessToken);
	const { pathname } = request.nextUrl;
	const hasAuthCookies = Boolean(accessToken || refreshToken);

	if (matchesProtectedPath(pathname) && !hasAuthCookies) {
		const loginUrl = new URL("/auth/login", request.url);
		loginUrl.searchParams.set("redirect", pathname);
		return NextResponse.redirect(loginUrl);
	}

	if (matchesGuestOnlyRoute(pathname) && (session || refreshToken)) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard/:path*", "/funcionarios/:path*", "/auth/login", "/auth/register"],
};