import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createPersistentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();
  if (!email || !password || !name) {
    return NextResponse.json({ error: "Dados obrigatórios ausentes." }, { status: 400 });
  }
  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) {
    return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, password: hashedPassword },
  });
  const response = NextResponse.json({ id: user.id, email: user.email, name: user.name });
  return createPersistentSession(response, user);
}
