"use client";
import React, { useEffect, useState } from "react";
import { Card, Typography, Button, Spin, message, Empty } from "antd";
import AuthenticatedHeader from "@/components/authenticated-header";
import { fetchJson } from "@/lib/http";

interface Funcionario {
  id: number;
  name: string;
  createdAt: string;
}

export default function FuncionariosListPage() {
  const [loading, setLoading] = useState(true);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

  useEffect(() => {
    async function fetchFuncionarios() {
      try {
        const data = await fetchJson<{ funcionarios: Funcionario[] }>("/api/funcionarios");
        setFuncionarios(data.funcionarios || []);
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : "Erro ao buscar funcionários");
      } finally {
        setLoading(false);
      }
    }

    fetchFuncionarios();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <AuthenticatedHeader title="Funcionários" subtitle="Lista de funcionários cadastrados" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px", paddingTop: 140 }}>
      <Card style={{ width: 420, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>
        <Typography.Title level={3} style={{ textAlign: "center", marginBottom: 32 }}>
          Funcionários Cadastrados
        </Typography.Title>
        {loading ? (
          <div style={{ textAlign: "center", padding: 32 }}><Spin size="large" /></div>
        ) : funcionarios.length === 0 ? (
          <Empty description="Nenhum funcionário cadastrado." image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {funcionarios.map((item) => (
              <a
                key={item.id}
                href={`/funcionarios/${item.id}`}
                style={{
                  display: "block",
                  padding: "14px 16px",
                  border: "1px solid #f0f0f0",
                  borderRadius: 12,
                  background: "#fafafa",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                }}
              >
                <Typography.Text strong>{item.name}</Typography.Text>
                <div>
                  <Typography.Text type="secondary">
                    Cadastrado em {new Date(item.createdAt).toLocaleString("pt-BR")}
                  </Typography.Text>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Typography.Text style={{ color: "#1677ff" }}>
                    Abrir painel financeiro do funcionário
                  </Typography.Text>
                </div>
              </a>
            ))}
          </div>
        )}
        <Button type="dashed" block style={{ marginTop: 24, borderRadius: 8 }} href="/funcionarios/cadastrar">
          Cadastrar Novo Funcionário
        </Button>
      </Card>
      </div>
    </div>
  );
}
