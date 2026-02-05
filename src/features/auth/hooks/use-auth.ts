import { useQuery } from "@tanstack/react-query";

import { fetchAuthStatus } from "@/src/features/auth/api/auth-queries";
import { QUERY_KEYS } from "@/src/shared/query-keys";

export function useAuth() {
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
