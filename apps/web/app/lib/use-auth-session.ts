"use client";

import useSWR from "swr";
import { type AuthSessionView, formatSessionRemaining } from "@/lib/auth";
import { fetchJson, UnauthorizedError } from "@/lib/http";

interface SessionResponse {
	session: AuthSessionView;
}

export function useAuthSession() {
	const result = useSWR<SessionResponse>("/api/auth/session", fetchJson, {
		refreshInterval: 60_000,
		revalidateOnFocus: true,
	});
	const session = result.data?.session ?? null;
	const isLoadingSession = !result.data && !result.error;

	return {
		...result,
		session,
		sessionLabel: isLoadingSession ? "Carregando sessao..." : formatSessionRemaining(session?.expiresAt ?? null),
		isLoadingSession,
		isUnauthorized: result.error instanceof UnauthorizedError,
	};
}