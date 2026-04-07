import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookies, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAuth(request);
  if (response || !session) {
    return response;
  }

  const { id } = await context.params;
  const driver = await prisma.driver.findUnique({ where: { id: Number(id) } });
  if (!driver) {
    return NextResponse.json({ error: "Motorista não encontrado" }, { status: 404 });
  }
  const driverResponse = NextResponse.json(driver, { status: 200 });
  return attachSessionCookies(driverResponse, {
    sessionId: session.session.id,
    user: session.session.user,
  });
}
