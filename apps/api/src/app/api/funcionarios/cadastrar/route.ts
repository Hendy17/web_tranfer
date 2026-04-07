
import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookies, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { session, response } = await requireAuth(req);
  if (response || !session) {
    return response;
  }

  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
  }
  const funcionario = await prisma.funcionario.create({
    data: { name },
  });
  const funcionarioResponse = NextResponse.json({ funcionario });
  return attachSessionCookies(funcionarioResponse, {
    sessionId: session.session.id,
    user: session.session.user,
  });
}
