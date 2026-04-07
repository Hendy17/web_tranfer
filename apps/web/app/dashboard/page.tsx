"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import useSWR from "swr";
import { Button, Spin, message } from "antd";
import { useRouter } from "next/navigation";
import { fetchJson, UnauthorizedError } from "@/lib/http";
import { useAuthSession } from "@/lib/use-auth-session";
import AuthenticatedHeader from "@/components/authenticated-header";
// Função para buscar dados do backend
const fetcher = <T,>(url: string) => fetchJson<T>(url);

interface EmpresaResponse {
  empresa: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [sessionExpired, setSessionExpired] = useState(false);
  const { isLoading: isSessionLoading } = useAuthSession();
  // Busca o nome da empresa logada
  const { data, error, isLoading } = useSWR<EmpresaResponse>("/api/empresa-logada", fetcher, {
    onError: (error) => {
      if (error instanceof UnauthorizedError) {
        setSessionExpired(true);
      }
    },
  });
  let empresa = "...";
  if (isLoading) empresa = "Carregando...";
  else if (error) empresa = "Erro ao carregar";
  else if (data && data.empresa) empresa = data.empresa;

  useEffect(() => {
    if (sessionExpired) {
      message.warning("Sua sessão expirou. Faça login novamente.");
    }
  }, [sessionExpired]);

  if (isSessionLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
    }}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 100 }}>
        <AuthenticatedHeader title="H8 Desenvolvimento de Software" subtitle="Painel principal" />
      </div>
      {/* Header da empresa logada */}
      <div style={{
        width: "100%",
        position: "fixed",
        top: 88,
        left: 0,
        background: '#e6f4ff',
        color: '#0050b3',
        padding: '8px 32px',
        fontWeight: 500,
        fontSize: 16,
        borderBottom: '1px solid #91d5ff',
        zIndex: 99
      }}>
        Empresa logada: <span style={{ fontWeight: 700 }}>{empresa}</span>
      </div>
      {/* Conteúdo central com menu */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
          padding: "48px 56px",
          minWidth: 380,
          maxWidth: "90vw",
          textAlign: "center",
          marginTop: 144
        }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 16, color: "#222" }}>Bem-vindo ao Dashboard</h1>
          <p style={{ fontSize: 18, color: "#555", marginBottom: 32 }}>
            Aqui você poderá acompanhar e gerenciar todos os dados do sistema.<br />
            Utilize o menu abaixo para navegar:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
            <Button type="primary" size="large" style={{ borderRadius: 8 }} onClick={() => router.push("/funcionarios")}>Funcionários</Button>
          </div>
          <Image src="/dashboard-illustration.svg" alt="Dashboard" width={180} height={180} style={{ opacity: 0.9 }} />
        </div>
      </div>
    </div>
  );
}
