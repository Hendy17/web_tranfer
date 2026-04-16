import type { DashboardPeriodFilter } from "common-types";

export interface ParsedDateRange {
	period: DashboardPeriodFilter;
	start: Date;
	end: Date;
}

function isValidDateString(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function startOfDay(date: Date) {
	const next = new Date(date);
	next.setHours(0, 0, 0, 0);
	return next;
}

function endOfDay(date: Date) {
	const next = new Date(date);
	next.setHours(23, 59, 59, 999);
	return next;
}

export function parseDashboardDateRange(searchParams: URLSearchParams): ParsedDateRange {
	const period = (searchParams.get("period") ?? "month") as DashboardPeriodFilter;
	const validPeriods: DashboardPeriodFilter[] = ["day", "week", "month", "custom"];

	if (!validPeriods.includes(period)) {
		throw new Error("Período inválido.");
	}

	const now = new Date();

	if (period === "custom") {
		const periodStart = searchParams.get("periodStart") ?? "";
		const periodEnd = searchParams.get("periodEnd") ?? "";

		if (!isValidDateString(periodStart) || !isValidDateString(periodEnd)) {
			throw new Error("Informe periodStart e periodEnd válidos para o intervalo customizado.");
		}

		const start = startOfDay(new Date(`${periodStart}T00:00:00`));
		const end = endOfDay(new Date(`${periodEnd}T00:00:00`));

		if (start.getTime() > end.getTime()) {
			throw new Error("periodStart não pode ser maior que periodEnd.");
		}

		return { period, start, end };
	}

	if (period === "day") {
		return {
			period,
			start: startOfDay(now),
			end: endOfDay(now),
		};
	}

	if (period === "week") {
		const day = now.getDay();
		const diff = day === 0 ? -6 : 1 - day;
		const start = new Date(now);
		start.setDate(now.getDate() + diff);
		return {
			period,
			start: startOfDay(start),
			end: endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)),
		};
	}

	return {
		period,
		start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
		end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
	};
}