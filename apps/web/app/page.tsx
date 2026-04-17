import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";

export default async function Home() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const session = await verifyAccessToken(accessToken);

  redirect(session ? "/dashboard" : "/auth/login");
}