import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookies, requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { session, response } = await requireAuth(request);
  if (response || !session) {
    return response;
  }

  const companyResponse = NextResponse.json({ empresa: "Transfer Executivo Premium" });
  return attachSessionCookies(companyResponse, {
    sessionId: session.session.id,
    user: session.session.user,
  });
}
