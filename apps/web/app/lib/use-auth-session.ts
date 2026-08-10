"use client";

import { formatSessionRemaining, type AuthSessionView } from "@/lib/auth";
import { useGetSessionQuery } from "@/features/auth/authApi";

interface SessionResponse {
	session: AuthSessionView;
}

export function useAuthSession() {
	const { data, error, isLoading, refetch } = useGetSessionQuery();
	const session = data?.session ?? null;
	const isLoadingSession = isLoading;

	return {
		data: data as SessionResponse | undefined,
		error,
		isLoading,
		refetch,
		session,
		sessionLabel: isLoadingSession ? "Carregando sessao..." : formatSessionRemaining(session?.expiresAt ?? null),
		isLoadingSession,
		isUnauthorized: false,
	};
}