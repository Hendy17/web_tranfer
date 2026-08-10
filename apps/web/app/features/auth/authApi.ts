import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { AuthSessionView } from "@/lib/auth";

export interface SessionResponse {
  session: AuthSessionView;
}

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/",
    credentials: "include",
  }),
  tagTypes: ["Session"],
  endpoints: (builder) => ({
    getSession: builder.query<SessionResponse, void>({
      query: () => "api/auth/session",
      providesTags: ["Session"],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: "api/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["Session"],
    }),
  }),
});

export const { useGetSessionQuery, useLogoutMutation } = authApi;
