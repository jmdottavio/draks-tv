import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { ReactNode } from "react";

type LayoutContextValue = {
	isSidebarOpen: boolean;
	toggleSidebar: () => void;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

const SIDEBAR_STORAGE_KEY = "sidebar-open";

function getSavedSidebarState(): boolean {
	if (typeof window === "undefined") {
		return false;
	}

	return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

type LayoutProviderProps = {
	children: ReactNode;
};

function LayoutProvider({ children }: LayoutProviderProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(getSavedSidebarState);

	const toggleSidebar = useCallback(() => {
		setIsSidebarOpen((previous) => {
			const newState = !previous;
			localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState));
			return newState;
		});
	}, []);

	const value = useMemo(() => ({ isSidebarOpen, toggleSidebar }), [isSidebarOpen, toggleSidebar]);

	return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

function useLayout() {
	const context = useContext(LayoutContext);

	if (context === null) {
		throw new Error("useLayout must be used within LayoutProvider");
	}

	return context;
}

export { LayoutProvider, useLayout };
