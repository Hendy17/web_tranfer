"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, Typography, Card, Space, message } from "antd";
import { UserOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";


export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao cadastrar");
      form.resetFields();
      message.success("Cadastro realizado com sucesso!");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5" }}>
      <Card style={{ width: 370, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}>
        <Typography.Title level={2} style={{ textAlign: "center", marginBottom: 32 }}>
          Criar Conta
        </Typography.Title>
        <Form
          form={form}
          name="register"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="on"
        >
          <Form.Item
            name="name"
            label="Nome"
            rules={[{ required: true, message: "Digite seu nome" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Digite seu nome" size="large" autoComplete="name" />
          </Form.Item>
          <Form.Item
            name="email"
            label="E-mail"
            rules={[
              { required: true, message: "Digite seu e-mail" },
              { type: "email", message: "E-mail inválido" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Digite seu e-mail" size="large" autoComplete="email" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Senha"
            rules={[{ required: true, message: "Digite sua senha" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Digite sua senha" size="large" autoComplete="new-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ borderRadius: 8 }}>
              Cadastrar
            </Button>
          </Form.Item>
        </Form>
        <Space orientation="vertical" style={{ width: "100%", marginTop: 16 }} size={8}>
          <Button
            type="default"
            block
            href="/auth/login"
            style={{ borderRadius: 8, color: "#1677ff", borderColor: "#1677ff", background: "#f6faff", fontWeight: 500 }}
          >
            Já tenho conta
          </Button>
        </Space>
      </Card>
    </div>
  );
}
