import { useQuery } from "@tanstack/react-query";

import { fetchAuthStatus } from "../lib/api";

function useAuth() {
	return useQuery({
		queryKey: ["auth"],
		queryFn: fetchAuthStatus,
	});
}

export { useAuth };
