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

	return {
		...result,
		session: result.data?.session ?? null,
		sessionLabel: formatSessionRemaining(result.data?.session.expiresAt ?? null),
		isUnauthorized: result.error instanceof UnauthorizedError,
	};
}