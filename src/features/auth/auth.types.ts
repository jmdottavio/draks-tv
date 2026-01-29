type AuthStatus = {
	authenticated: boolean;
	userId: string | null;
};

type AuthUrl = {
	url: string;
};

export type { AuthStatus, AuthUrl };
