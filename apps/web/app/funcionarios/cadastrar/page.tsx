"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Card, Typography, message } from "antd";
import AuthenticatedHeader from "@/components/authenticated-header";
import { fetchJson } from "@/lib/http";

interface FuncionarioFormValues {
  name: string;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro ao cadastrar funcionário";
}

export default function FuncionarioCadastrarPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();

  const onFinish = async (values: FuncionarioFormValues) => {
    setLoading(true);
    try {
      await fetchJson<{ funcionario: { id: number; name: string; createdAt: string } }>(
        "/api/funcionarios/cadastrar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      form.resetFields();
      message.success("Funcionário cadastrado com sucesso!");
      router.push("/funcionarios");
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <AuthenticatedHeader title="Cadastrar Funcionário" subtitle="Adicione um novo funcionário ao sistema" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px", paddingTop: 140 }}>
      <Card style={{ width: 370, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>
        <Typography.Title level={3} style={{ textAlign: "center", marginBottom: 32 }}>
          Cadastrar Funcionário
        </Typography.Title>
        <Form form={form} name="funcionario-cadastrar" layout="vertical" onFinish={onFinish} autoComplete="on">
          <Form.Item name="name" label="Nome" rules={[{ required: true, message: "Digite o nome" }]}>
            <Input placeholder="Digite o nome" size="large" autoComplete="name" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ borderRadius: 8 }}>
              Cadastrar
            </Button>
          </Form.Item>
        </Form>
      </Card>
      </div>
    </div>
  );
}
