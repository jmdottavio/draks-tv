import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/src/shared/query-keys";

import { fetchAuthStatus } from "../api/auth-queries";

function useAuth() {
	const { data, isLoading, error } = useQuery({
		queryKey: QUERY_KEYS.auth,
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
