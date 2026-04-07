export class HttpError extends Error {
	status: number;
	payload: unknown;

	constructor(message: string, status: number, payload: unknown) {
		super(message);
		this.name = "HttpError";
		this.status = status;
		this.payload = payload;
	}
}

export class UnauthorizedError extends HttpError {
	constructor(message = "Sessão expirada. Faça login novamente.", payload?: unknown) {
		super(message, 401, payload);
		this.name = "UnauthorizedError";
	}
}

let refreshInFlight: Promise<void> | null = null;

function redirectToLogin() {
	if (typeof window === "undefined") {
		return;
	}

	const redirect = `${window.location.pathname}${window.location.search}`;
	window.location.assign(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
}

async function refreshSession() {
	const response = await fetch("/api/auth/session", {
		method: "GET",
		credentials: "include",
	});

	if (!response.ok) {
		throw new UnauthorizedError();
	}
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit, allowRetry = true): Promise<T> {
	const response = await fetch(input, init);
	const payload = await response.json().catch(() => null);

	if (!response.ok) {
		const message =
			typeof payload === "object" && payload && "error" in payload && typeof payload.error === "string"
				? payload.error
				: "Erro inesperado na requisição.";

		if (response.status === 401) {
			if (allowRetry) {
				if (!refreshInFlight) {
					refreshInFlight = refreshSession().finally(() => {
						refreshInFlight = null;
					});
				}

				try {
					await refreshInFlight;
					return fetchJson<T>(input, init, false);
				} catch {
					redirectToLogin();
					throw new UnauthorizedError(message, payload);
				}
			}

			redirectToLogin();
			throw new UnauthorizedError(message, payload);
		}

		throw new HttpError(message, response.status, payload);
	}

	return payload as T;
}