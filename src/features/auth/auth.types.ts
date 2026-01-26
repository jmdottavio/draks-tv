interface AuthStatus {
	authenticated: boolean;
	userId: string | null;
}

interface AuthUrl {
	url: string;
}

export type { AuthStatus, AuthUrl };
