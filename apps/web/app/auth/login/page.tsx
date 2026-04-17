"use client";


import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Typography, Card, Space, Spin, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";


export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [form] = Form.useForm();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function validateSession() {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const redirectTo = new URLSearchParams(window.location.search).get("redirect") || "/dashboard";
        router.replace(redirectTo);
        router.refresh();
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    validateSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao fazer login");
      const redirectTo = typeof window === "undefined"
        ? "/dashboard"
        : new URLSearchParams(window.location.search).get("redirect") || "/dashboard";
      message.success("Login realizado com sucesso!");
      router.push(redirectTo);
      router.refresh();
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f0f2f5" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5" }}>
      <Card style={{ width: 370, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>
        <Typography.Title level={2} style={{ textAlign: "center", marginBottom: 32 }}>
          Login
        </Typography.Title>
        <Form
          form={form}
          name="login"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="on"
        >
          <Form.Item
            name="email"
            label="E-mail"
            rules={[
              { required: true, message: "Digite seu e-mail" },
              { type: "email", message: "E-mail inválido" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Digite seu e-mail" size="large" autoComplete="email" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Senha"
            rules={[{ required: true, message: "Digite sua senha" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Digite sua senha" size="large" autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ borderRadius: 8 }}>
              Entrar
            </Button>
          </Form.Item>
        </Form>
        <Space orientation="vertical" style={{ width: "100%", marginTop: 16 }} size={8}>
          <Button
            type="default"
            block
            href="/auth/forgot"
            style={{ borderRadius: 8, color: "#1677ff", borderColor: "#1677ff", background: "#f6faff", fontWeight: 500 }}
          >
            Esqueci minha senha
          </Button>
          <Button
            type="dashed"
            block
            href="/auth/register"
            style={{ borderRadius: 8, color: "#52c41a", borderColor: "#52c41a", background: "#f6fff6", fontWeight: 500 }}
          >
            Criar conta
          </Button>
        </Space>
      </Card>
    </div>
  );
}
