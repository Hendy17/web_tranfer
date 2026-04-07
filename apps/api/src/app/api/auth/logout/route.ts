import { NextResponse } from "next/server";
import { clearAuthCookie, revokeSessionFromRequest } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
	await revokeSessionFromRequest(request);
	const response = NextResponse.json({ success: true });
	return clearAuthCookie(response);
}