import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createPersistentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Dados obrigatórios ausentes." }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }
  const response = NextResponse.json({ id: user.id, email: user.email, name: user.name });
  return createPersistentSession(response, user);
}
