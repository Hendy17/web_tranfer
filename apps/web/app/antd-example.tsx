"use client";
import { Layout, Menu } from "antd";
import useSWR from "swr";
// Função para buscar dados do backend
const fetcher = (url: string) => fetch(url).then((res) => res.json());
import { UserOutlined, LaptopOutlined, NotificationOutlined } from "@ant-design/icons";

const { Header, Content, Sider } = Layout;

export default function AntdExampleLayout() {
  // Exemplo: endpoint que retorna { empresa: "Transfer Executivo Premium" }
  const { data, error, isLoading } = useSWR("/api/empresa-logada", fetcher);

  let empresa = "...";
  if (isLoading) empresa = "Carregando...";
  else if (error) empresa = "Erro ao carregar";
  else if (data && data.empresa) empresa = data.empresa;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center" }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: 20 }}>H8 Desenvolvimento de Software</div>
      </Header>
      <div style={{ background: '#e6f4ff', color: '#0050b3', padding: '8px 32px', fontWeight: 500, fontSize: 16, borderBottom: '1px solid #91d5ff' }}>
        Empresa logada: <span style={{ fontWeight: 700 }}>{empresa}</span>
      </div>
      <Layout>
        <Sider width={200} style={{ background: "#fff" }}>
          <Menu
            mode="inline"
            defaultSelectedKeys={["1"]}
            style={{ height: "100%", borderRight: 0 }}
            items={[
              { key: "1", icon: <UserOutlined />, label: "Usuário" },
              { key: "2", icon: <LaptopOutlined />, label: "Dashboard" },
              { key: "3", icon: <NotificationOutlined />, label: "Notificações" },
            ]}
          />
        </Sider>
        <Layout style={{ padding: "24px" }}>
          <Content style={{ background: "#fff", padding: 24, margin: 0, minHeight: 280 }}>
            Conteúdo principal do Ant Design!
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
