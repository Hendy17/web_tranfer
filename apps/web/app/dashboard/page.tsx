"use client";
import React, { useEffect, useMemo, useState } from "react";
import type { DashboardExecutivoEmpresa, DashboardPeriodFilter } from "common-types";
import Image from "next/image";
import useSWR from "swr";
import { Button, Card, Col, Empty, Input, Row, Select, Spin, Tag, Typography, message } from "antd";
import { useRouter } from "next/navigation";
import { fetchJson, HttpError, UnauthorizedError } from "@/lib/http";
import { useAuthSession } from "@/lib/use-auth-session";
import AuthenticatedHeader from "@/components/authenticated-header";

const fetcher = <T,>(url: string) => fetchJson<T>(url);

const periodLabels: Record<DashboardPeriodFilter, string> = {
  day: "Hoje",
  week: "Esta semana",
  month: "Este mês",
  custom: "Intervalo customizado",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatCompactMonth(reference: string) {
  const [year, month] = reference.split("-");
  return `${month}/${year}`;
}

function buildExecutiveUrl(period: DashboardPeriodFilter, periodStart: string, periodEnd: string) {
  const params = new URLSearchParams({ period });
  if (period === "custom") {
    params.set("periodStart", periodStart);
    params.set("periodEnd", periodEnd);
  }

  return `/api/dashboard/executivo?${params.toString()}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [period, setPeriod] = useState<DashboardPeriodFilter>("month");
  const [periodStart, setPeriodStart] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const { isLoading: isSessionLoading } = useAuthSession();
  const dashboardUrl = useMemo(() => buildExecutiveUrl(period, periodStart, periodEnd), [period, periodEnd, periodStart]);
  const { data, error, isLoading } = useSWR<DashboardExecutivoEmpresa>(dashboardUrl, fetcher, {
    onError: (error) => {
      if (error instanceof UnauthorizedError) {
        setSessionExpired(true);
      }
    },
  });

  const dashboardErrorMessage = useMemo(() => {
    if (error instanceof HttpError) {
      if (error.status === 404) {
        return "A API do dashboard não foi encontrada. Configure API_BASE_URL no deploy do app web para apontar para o projeto apps/api.";
      }

      return error.message;
    }

    return "Não foi possível carregar o dashboard executivo.";
  }, [error]);

  useEffect(() => {
    if (sessionExpired) {
      message.warning("Sua sessão expirou. Faça login novamente.");
    }
  }, [sessionExpired]);

  useEffect(() => {
    if (!data) {
      return;
    }

    setPeriodStart(data.periodoInicio.slice(0, 10));
    setPeriodEnd(data.periodoFim.slice(0, 10));
  }, [data]);

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
      background: "linear-gradient(135deg, #f6f1e8 0%, #eef5ff 45%, #f4faf7 100%)",
    }}>
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 100 }}>
        <AuthenticatedHeader title={data?.empresa ?? "Transfer Executivo Premium"} subtitle="Dashboard executivo de eficiência energética" />
      </div>
      <div style={{
        width: "100%",
        position: "fixed",
        top: 88,
        left: 0,
        background: '#eff6ff',
        color: '#114b9d',
        padding: '8px 32px',
        fontWeight: 500,
        fontSize: 16,
        borderBottom: '1px solid #c5dcff',
        zIndex: 99
      }}>
        Empresa logada: <span style={{ fontWeight: 700 }}>{data?.empresa ?? "Carregando..."}</span>
      </div>
      <div style={{
        maxWidth: 1240,
        margin: "0 auto",
        padding: "154px 18px 40px",
      }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(16,33,70,0.96), rgba(20,85,192,0.88))",
          color: "#fff",
          borderRadius: 28,
          padding: 28,
          boxShadow: "0 28px 80px rgba(16, 33, 70, 0.24)",
          marginBottom: 18,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <Typography.Title level={2} style={{ color: "#fff", margin: 0 }}>Eficiência energética consolidada</Typography.Title>
              <Typography.Paragraph style={{ color: "rgba(255,255,255,0.76)", marginTop: 10, marginBottom: 0 }}>
                Visão executiva do custo por quilômetro real dos EVs, comparação com combustão e participação de recargas gratuitas.
              </Typography.Paragraph>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Tag color="blue">{periodLabels[period]}</Tag>
              <Tag color="cyan">Combustão referência: {data ? formatCurrency(data.parametrosCombustao.cpk) : "..."}/km</Tag>
            </div>
          </div>
        </div>

        <Card style={{ borderRadius: 24, marginBottom: 18, border: "1px solid rgba(24,39,75,0.08)", boxShadow: "0 18px 48px rgba(26,36,64,0.08)" }}>
          <Row gutter={[16, 16]} align="bottom">
            <Col xs={24} md={8}>
              <label style={{ display: "block", marginBottom: 8, color: "#55647c", fontWeight: 600 }}>Período analisado</label>
              <Select<DashboardPeriodFilter> style={{ width: "100%" }} value={period} onChange={setPeriod} options={Object.entries(periodLabels).map(([value, label]) => ({ value: value as DashboardPeriodFilter, label }))} />
            </Col>
            <Col xs={24} md={8}>
              <label style={{ display: "block", marginBottom: 8, color: "#55647c", fontWeight: 600 }}>Início do intervalo</label>
              <Input type="date" value={periodStart} disabled={period !== "custom"} onChange={(event) => setPeriodStart(event.target.value)} />
            </Col>
            <Col xs={24} md={8}>
              <label style={{ display: "block", marginBottom: 8, color: "#55647c", fontWeight: 600 }}>Fim do intervalo</label>
              <Input type="date" value={periodEnd} disabled={period !== "custom"} onChange={(event) => setPeriodEnd(event.target.value)} />
            </Col>
          </Row>
        </Card>

        {isLoading ? (
          <div style={{ minHeight: 300, display: "grid", placeItems: "center" }}><Spin size="large" /></div>
        ) : error || !data ? (
          <Card style={{ borderRadius: 24 }}><Empty description={dashboardErrorMessage} /></Card>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} xl={6}><Card style={{ borderRadius: 22 }}><Typography.Text style={{ color: "#63728a" }}>CPK real EV</Typography.Text><Typography.Title level={3} style={{ marginTop: 8 }}>{formatCurrency(data.resumo.cpkReal)}</Typography.Title><Typography.Text style={{ color: "#75839a" }}>{formatCurrency(data.resumo.custoRealRecargas)} em recargas</Typography.Text></Card></Col>
              <Col xs={24} md={12} xl={6}><Card style={{ borderRadius: 22 }}><Typography.Text style={{ color: "#63728a" }}>CPK combustão</Typography.Text><Typography.Title level={3} style={{ marginTop: 8 }}>{formatCurrency(data.resumo.cpkCombustao)}</Typography.Title><Typography.Text style={{ color: "#75839a" }}>{formatCurrency(data.resumo.custoCombustaoHipotetico)} no cenário teórico</Typography.Text></Card></Col>
              <Col xs={24} md={12} xl={6}><Card style={{ borderRadius: 22 }}><Typography.Text style={{ color: "#63728a" }}>Economia total</Typography.Text><Typography.Title level={3} style={{ marginTop: 8, color: data.resumo.economiaTotal >= 0 ? "#1455c0" : "#d34a36" }}>{formatCurrency(data.resumo.economiaTotal)}</Typography.Title><Typography.Text style={{ color: "#75839a" }}>{data.resumo.totalKm.toFixed(2)} km analisados</Typography.Text></Card></Col>
              <Col xs={24} md={12} xl={6}><Card style={{ borderRadius: 22 }}><Typography.Text style={{ color: "#63728a" }}>Recargas gratuitas</Typography.Text><Typography.Title level={3} style={{ marginTop: 8 }}>{formatPercentage(data.resumo.percentualRecargasGratuitas)}</Typography.Title><Typography.Text style={{ color: "#75839a" }}>{data.resumo.recargasGratuitas} de {data.resumo.totalRecargas} recargas</Typography.Text></Card></Col>
            </Row>

            <Card style={{ borderRadius: 24, marginTop: 16, border: "1px solid rgba(24,39,75,0.08)", boxShadow: "0 18px 48px rgba(26,36,64,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
                <div>
                  <Typography.Title level={4} style={{ margin: 0 }}>Resumo mensal consolidado</Typography.Title>
                  <Typography.Text style={{ color: "#66758f" }}>Prestação e seguro entram como custos fixos recorrentes para leitura executiva do mês.</Typography.Text>
                </div>
                <Tag color="gold">Custos fixos recorrentes</Tag>
              </div>
              {data.resumoMensal.length === 0 ? (
                <Empty description="Sem lançamentos no período para consolidar por mês." />
              ) : (
                <Row gutter={[16, 16]}>
                  {data.resumoMensal.map((item) => (
                    <Col xs={24} xl={12} key={item.referenciaMes}>
                      <div style={{ padding: 18, borderRadius: 22, background: "linear-gradient(135deg, #fbfdff, #f6fbf8)", border: "1px solid rgba(24,39,75,0.08)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
                          <div>
                            <Typography.Title level={5} style={{ margin: 0 }}>{item.label}</Typography.Title>
                            <Typography.Text style={{ color: "#6f7e96" }}>Competência {formatCompactMonth(item.referenciaMes)}</Typography.Text>
                          </div>
                          <Tag color={item.saldo >= 0 ? "blue" : "red"}>Saldo {formatCurrency(item.saldo)}</Tag>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 14 }}>
                          <div style={{ padding: 14, borderRadius: 16, background: "#ffffff", border: "1px solid rgba(24,39,75,0.06)" }}>
                            <Typography.Text style={{ display: "block", color: "#72819a", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12 }}>Ganhos</Typography.Text>
                            <Typography.Title level={5} style={{ margin: "8px 0 0", color: "#1455c0" }}>{formatCurrency(item.totalGanhos)}</Typography.Title>
                          </div>
                          <div style={{ padding: 14, borderRadius: 16, background: "#ffffff", border: "1px solid rgba(24,39,75,0.06)" }}>
                            <Typography.Text style={{ display: "block", color: "#72819a", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12 }}>Gastos</Typography.Text>
                            <Typography.Title level={5} style={{ margin: "8px 0 0", color: "#d34a36" }}>{formatCurrency(item.totalGastos)}</Typography.Title>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                          <div style={{ padding: 14, borderRadius: 16, background: "#fffaf0", border: "1px solid #f2d790" }}>
                            <Typography.Text style={{ display: "block", color: "#8a6a1f", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12 }}>Prestação</Typography.Text>
                            <Typography.Title level={5} style={{ margin: "8px 0 0", color: "#7c5d16" }}>{formatCurrency(item.totalPrestacao)}</Typography.Title>
                          </div>
                          <div style={{ padding: 14, borderRadius: 16, background: "#fffaf0", border: "1px solid #f2d790" }}>
                            <Typography.Text style={{ display: "block", color: "#8a6a1f", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12 }}>Seguro</Typography.Text>
                            <Typography.Title level={5} style={{ margin: "8px 0 0", color: "#7c5d16" }}>{formatCurrency(item.totalSeguro)}</Typography.Title>
                          </div>
                          <div style={{ padding: 14, borderRadius: 16, background: "#eef7ff", border: "1px solid #d4e2ff" }}>
                            <Typography.Text style={{ display: "block", color: "#4d6687", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12 }}>Custos fixos</Typography.Text>
                            <Typography.Title level={5} style={{ margin: "8px 0 0", color: "#1455c0" }}>{formatCurrency(item.totalCustosFixos)}</Typography.Title>
                            <Typography.Text style={{ color: "#6f7e96" }}>{formatPercentage(item.percentualCustosFixosSobreGastos)} dos gastos</Typography.Text>
                          </div>
                        </div>
                        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Tag color="cyan">Recargas {formatCurrency(item.totalRecargas)}</Tag>
                          <Tag color="geekblue">Custos fixos {formatCurrency(item.totalCustosFixos)}</Tag>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>

            <Row gutter={[16, 16]} style={{ marginTop: 2 }}>
              <Col xs={24} lg={16}>
                <Card style={{ borderRadius: 24, height: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
                    <div>
                      <Typography.Title level={4} style={{ margin: 0 }}>Funcionários com maior economia</Typography.Title>
                      <Typography.Text style={{ color: "#66758f" }}>Consolidado por colaborador no intervalo selecionado.</Typography.Text>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Tag color="geekblue">{data.totais.funcionariosAtivos} funcionários ativos</Tag>
                      <Tag color="green">{data.totais.veiculosAtivos} veículos ativos</Tag>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {data.porFuncionario.slice(0, 6).map((item) => (
                      <div key={item.funcionarioId} style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: 16, borderRadius: 18, background: "linear-gradient(135deg, #f8fbff, #f3faf7)", border: "1px solid rgba(24,39,75,0.08)" }}>
                        <div>
                          <Typography.Title level={5} style={{ margin: 0 }}>{item.nome}</Typography.Title>
                          <Typography.Text style={{ color: "#6f7e96" }}>{item.veiculosAtivos} veículos ativos • {item.totalKm.toFixed(2)} km</Typography.Text>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <Typography.Text style={{ display: "block", color: "#6f7e96" }}>Economia total</Typography.Text>
                          <Typography.Title level={5} style={{ margin: 0, color: item.economiaTotal >= 0 ? "#1455c0" : "#d34a36" }}>{formatCurrency(item.economiaTotal)}</Typography.Title>
                          <Typography.Text style={{ color: "#6f7e96" }}>CPK EV {formatCurrency(item.cpkReal)}</Typography.Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card style={{ borderRadius: 24, height: "100%" }}>
                  <Typography.Title level={4} style={{ marginTop: 0 }}>Navegação rápida</Typography.Title>
                  <Typography.Paragraph style={{ color: "#66758f" }}>Acesse o módulo operacional para cadastrar veículos, acompanhar lançamentos e abrir o painel de cada funcionário.</Typography.Paragraph>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                    <Button type="primary" size="large" style={{ borderRadius: 12 }} onClick={() => router.push("/funcionarios")}>Funcionários</Button>
                  </div>
                  <div style={{ display: "grid", placeItems: "center" }}>
                    <Image src="/dashboard-illustration.svg" alt="Dashboard executivo" width={180} height={180} style={{ opacity: 0.92 }} />
                  </div>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </div>
    </div>
  );
}
