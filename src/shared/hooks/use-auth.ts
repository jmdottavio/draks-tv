import { useQuery } from "@tanstack/react-query";

import { fetchAuthStatus } from "../lib/api";

export const AUTH_QUERY_KEY = ["auth"] as const;

interface UseAuthResult {
	isAuthenticated: boolean;
	userId: string | null;
	isLoading: boolean;
	error: Error | null;
}

function useAuth(): UseAuthResult {
	const { data, isLoading, error } = useQuery({
		queryKey: AUTH_QUERY_KEY,
		queryFn: fetchAuthStatus,
	});

	return {
		isAuthenticated: data?.authenticated ?? false,
		userId: data?.userId ?? null,
		isLoading,
		error: error instanceof Error ? error : null,
	};
}

export { useAuth };
