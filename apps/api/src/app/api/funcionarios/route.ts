
import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookies, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { session, response } = await requireAuth(request);
  if (response || !session) {
    return response;
  }

  const funcionarios = await prisma.funcionario.findMany({
    orderBy: { createdAt: "desc" },
  });

  const funcionariosResponse = NextResponse.json({ funcionarios });
  return attachSessionCookies(funcionariosResponse, {
    sessionId: session.session.id,
    user: session.session.user,
  });
}
