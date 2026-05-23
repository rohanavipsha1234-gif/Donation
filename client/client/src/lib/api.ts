import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions, QueryKey } from "@tanstack/react-query";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RobloxUser {
  id: number;
  name: string;
  displayName: string;
  avatarUrl?: string | null;
  description?: string | null;
}

export interface Gamepass {
  id: number;
  name: string;
  price: number;
  iconUrl?: string | null;
  sellerName?: string | null;
  gameId: number;
  gameName?: string | null;
}

export interface GamepassList {
  gamepasses: Gamepass[];
  cached: boolean;
  fetchedAt: string;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg =
      (data as { error?: string })?.error ??
      `HTTP ${res.status} ${res.statusText}`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const getGetRobloxUserQueryKey = (username: string) =>
  ["/api/user", username] as const;

export const getGetGamepassesQueryKey = (userId: number) =>
  ["/api/gamepasses", userId] as const;

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useGetRobloxUser(
  username: string,
  options?: {
    query?: Omit<
      UseQueryOptions<RobloxUser, ApiError, RobloxUser, QueryKey>,
      "queryKey" | "queryFn"
    > & { queryKey?: QueryKey };
  }
) {
  const { query } = options ?? {};
  return useQuery<RobloxUser, ApiError>({
    ...query,
    queryKey: query?.queryKey ?? getGetRobloxUserQueryKey(username),
    queryFn: () =>
      apiFetch<RobloxUser>(`/api/user/${encodeURIComponent(username)}`),
  });
}

export function useGetGamepasses(
  userId: number,
  options?: {
    query?: Omit<
      UseQueryOptions<GamepassList, ApiError, GamepassList, QueryKey>,
      "queryKey" | "queryFn"
    > & { queryKey?: QueryKey };
  }
) {
  const { query } = options ?? {};
  return useQuery<GamepassList, ApiError>({
    ...query,
    queryKey: query?.queryKey ?? getGetGamepassesQueryKey(userId),
    queryFn: () => apiFetch<GamepassList>(`/api/gamepasses/${userId}`),
  });
}
