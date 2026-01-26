import { createContext, useContext, useState, useEffect } from "react";

import type { ReactNode } from "react";

interface LayoutContextValue {
	isSidebarOpen: boolean;
	toggleSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

function getSavedSidebarState(): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	return localStorage.getItem("sidebar-open") === "true";
}

interface LayoutProviderProps {
	children: ReactNode;
}

function LayoutProvider({ children }: LayoutProviderProps) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(getSavedSidebarState);

	useEffect(() => {
		localStorage.setItem("sidebar-open", String(isSidebarOpen));
	}, [isSidebarOpen]);

	function toggleSidebar() {
		setIsSidebarOpen((previous) => !previous);
	}

	return (
		<LayoutContext.Provider value={{ isSidebarOpen, toggleSidebar }}>
			{children}
		</LayoutContext.Provider>
	);
}

function useLayout() {
	const context = useContext(LayoutContext);

	if (context === null) {
		throw new Error("useLayout must be used within LayoutProvider");
	}

	return context;
}

export { LayoutProvider, useLayout };
