import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { DashboardExecutivoEmpresa, DashboardPeriodFilter } from "common-types";

export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/",
    credentials: "include",
  }),
  tagTypes: ["Dashboard"],
  endpoints: (builder) => ({
    getExecutiveDashboard: builder.query<DashboardExecutivoEmpresa, DashboardPeriodFilter>({
      query: (period) => `api/dashboard/executivo?period=${period}`,
      providesTags: ["Dashboard"],
    }),
  }),
});

export const { useGetExecutiveDashboardQuery } = dashboardApi;
