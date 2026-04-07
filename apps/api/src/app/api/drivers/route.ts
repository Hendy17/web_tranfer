import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookies, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { session, response } = await requireAuth(req);
  if (response || !session) {
    return response;
  }

  const drivers = await prisma.driver.findMany({ orderBy: { name: "asc" } });
  const driversResponse = NextResponse.json(drivers, { status: 200 });
  return attachSessionCookies(driversResponse, {
    sessionId: session.session.id,
    user: session.session.user,
  });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireAuth(req);
  if (response || !session) {
    return response;
  }

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  const driver = await prisma.driver.create({ data: { name } });
  const driverResponse = NextResponse.json(driver, { status: 201 });
  return attachSessionCookies(driverResponse, {
    sessionId: session.session.id,
    user: session.session.user,
  });
}
