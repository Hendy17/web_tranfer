import type { DashboardPeriodFilter } from "common-types";

export interface ParsedDateRange {
	period: DashboardPeriodFilter;
	start: Date;
	end: Date;
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
	const period = (searchParams.get("period") ?? "previous_month") as DashboardPeriodFilter;
	const validPeriods: DashboardPeriodFilter[] = ["previous_month", "quarterly", "semiannual", "yearly"];

	if (!validPeriods.includes(period)) {
		throw new Error("Período inválido.");
	}

	const now = new Date();
	const end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));

	if (period === "previous_month") {
		return {
			period,
			start: startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
			end,
		};
	}

	if (period === "quarterly") {
		return {
			period,
			start: startOfDay(new Date(now.getFullYear(), now.getMonth() - 3, 1)),
			end,
		};
	}

	if (period === "semiannual") {
		return {
			period,
			start: startOfDay(new Date(now.getFullYear(), now.getMonth() - 6, 1)),
			end,
		};
	}

	return {
		period,
		start: startOfDay(new Date(now.getFullYear(), now.getMonth() - 12, 1)),
		end,
	};
}