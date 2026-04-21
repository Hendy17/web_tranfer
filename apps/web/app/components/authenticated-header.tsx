"use client";

import React from "react";
import { Button, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/use-auth-session";

interface AuthenticatedHeaderProps {
	title: string;
	subtitle?: string;
}

export default function AuthenticatedHeader({ title, subtitle }: AuthenticatedHeaderProps) {
	const router = useRouter();
	const { session, sessionLabel, isLoadingSession } = useAuthSession();
	const [isLoggingOut, setIsLoggingOut] = React.useState(false);

	async function handleLogout() {
		setIsLoggingOut(true);
		try {
			await fetch("/api/auth/logout", { method: "POST" });
			router.replace("/auth/login");
			router.refresh();
		} finally {
			setIsLoggingOut(false);
		}
	}

	return (
		<header
			style={{
				width: "100%",
				background: "#fff",
				boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
				padding: "16px 24px",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 16,
			}}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
				<Typography.Title level={4} style={{ margin: 0 }}>
					{title}
				</Typography.Title>
				{subtitle ? <Typography.Text type="secondary">{subtitle}</Typography.Text> : null}
				<Typography.Text type="secondary">{isLoadingSession ? "Carregando usuario..." : session?.name || session?.email || "Usuario autenticado"}</Typography.Text>
				<Typography.Text type="secondary">{sessionLabel}</Typography.Text>
			</div>
			<Button danger onClick={handleLogout} loading={isLoggingOut}>
				Sair
			</Button>
		</header>
	);
}