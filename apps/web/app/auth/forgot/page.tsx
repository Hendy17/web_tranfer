"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setStatus(data.message || data.error || "Solicitação enviada.");
    } catch (err: any) {
      setStatus("Erro ao solicitar recuperação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-lg p-8 border border-border">
        <h1 className="text-3xl font-bold mb-8 text-center">Recuperar Senha</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="Digite seu e-mail" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          {status && (
            <span className={`text-sm text-center ${status.includes('Erro') ? 'text-destructive' : 'text-green-600'}`}>{status}</span>
          )}
          <Button type="submit" className="mt-2" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </form>
        <div className="flex flex-col items-center gap-2 mt-6">
          <a href="/auth/login" className="text-sm text-muted-foreground hover:underline">Voltar ao login</a>
        </div>
      </div>
    </main>
  );
}
