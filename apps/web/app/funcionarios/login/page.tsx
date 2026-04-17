import { redirect } from "next/navigation";

export default function FuncionarioLoginPage() {
  redirect("/auth/login?redirect=%2Ffuncionarios");
}
