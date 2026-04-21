import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
	const { session, response } = await requireAuth(request);
	if (response || !session) {
		return response;
	}

	await prisma.user.delete({
		where: { id: session.session.user.id },
	});

	const payload = NextResponse.json({ success: true });
	return clearAuthCookie(payload);
}