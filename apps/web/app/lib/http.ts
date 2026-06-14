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
const REQUEST_TIMEOUT_MS = 15_000;

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

function createRequestSignal(externalSignal?: AbortSignal | null) {
	const controller = new AbortController();
	let timedOut = false;

	const timeoutId = globalThis.setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, REQUEST_TIMEOUT_MS);

	const onExternalAbort = () => {
		controller.abort();
	};

	if (externalSignal) {
		if (externalSignal.aborted) {
			onExternalAbort();
		} else {
			externalSignal.addEventListener("abort", onExternalAbort, { once: true });
		}
	}

	const cleanup = () => {
		globalThis.clearTimeout(timeoutId);
		if (externalSignal) {
			externalSignal.removeEventListener("abort", onExternalAbort);
		}
	};

	return { signal: controller.signal, cleanup, didTimeout: () => timedOut };
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit, allowRetry = true): Promise<T> {
	const { signal, cleanup, didTimeout } = createRequestSignal(init?.signal);
	let response: Response;

	try {
		response = await fetch(input, { ...init, signal });
	} catch (error) {
		cleanup();

		if (didTimeout()) {
			throw new HttpError("Tempo limite de requisição excedido. Verifique a API e tente novamente.", 408, null);
		}

		if (error instanceof DOMException && error.name === "AbortError") {
			throw new HttpError("Requisição cancelada.", 499, null);
		}

		throw new HttpError("Não foi possível conectar com a API.", 0, null);
	}

	cleanup();
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