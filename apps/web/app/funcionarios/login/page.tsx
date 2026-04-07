"use client";
import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, message } from "antd";

export default function FuncionarioLoginPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Troque o endpoint para o correto do backend
      const res = await fetch("/api/funcionarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao fazer login");
      message.success("Login de funcionário realizado com sucesso!");
      // Redirecionar ou salvar token aqui
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5" }}>
      <Card style={{ width: 370, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>
        <Typography.Title level={3} style={{ textAlign: "center", marginBottom: 32 }}>
          Login de Funcionário
        </Typography.Title>
        <Form form={form} name="funcionario-login" layout="vertical" onFinish={onFinish} autoComplete="on">
          <Form.Item name="email" label="E-mail" rules={[{ required: true, message: "Digite o e-mail" }, { type: "email", message: "E-mail inválido" }]}>
            <Input placeholder="Digite o e-mail" size="large" autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" label="Senha" rules={[{ required: true, message: "Digite a senha" }]}>
            <Input.Password placeholder="Digite a senha" size="large" autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ borderRadius: 8 }}>
              Entrar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
