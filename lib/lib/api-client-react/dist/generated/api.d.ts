import type { QueryKey, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { ErrorResponse, GamepassList, HealthStatus, RobloxUser } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * Returns server health status
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetRobloxUserUrl: (username: string) => string;
/**
 * @summary Look up a Roblox user by username
 */
export declare const getRobloxUser: (username: string, options?: RequestInit) => Promise<RobloxUser>;
export declare const getGetRobloxUserQueryKey: (username: string) => readonly [`/api/user/${string}`];
export declare const getGetRobloxUserQueryOptions: <TData = Awaited<ReturnType<typeof getRobloxUser>>, TError = ErrorType<ErrorResponse>>(username: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRobloxUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRobloxUser>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRobloxUserQueryResult = NonNullable<Awaited<ReturnType<typeof getRobloxUser>>>;
export type GetRobloxUserQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Look up a Roblox user by username
 */
export declare function useGetRobloxUser<TData = Awaited<ReturnType<typeof getRobloxUser>>, TError = ErrorType<ErrorResponse>>(username: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRobloxUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetGamepassesUrl: (userId: number) => string;
/**
 * @summary Fetch all on-sale gamepasses for a Roblox user
 */
export declare const getGamepasses: (userId: number, options?: RequestInit) => Promise<GamepassList>;
export declare const getGetGamepassesQueryKey: (userId: number) => readonly [`/api/gamepasses/${number}`];
export declare const getGetGamepassesQueryOptions: <TData = Awaited<ReturnType<typeof getGamepasses>>, TError = ErrorType<ErrorResponse>>(userId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGamepasses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGamepasses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGamepassesQueryResult = NonNullable<Awaited<ReturnType<typeof getGamepasses>>>;
export type GetGamepassesQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Fetch all on-sale gamepasses for a Roblox user
 */
export declare function useGetGamepasses<TData = Awaited<ReturnType<typeof getGamepasses>>, TError = ErrorType<ErrorResponse>>(userId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGamepasses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map