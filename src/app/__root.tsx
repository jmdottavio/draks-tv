import { useState } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { LayoutProvider, useLayout } from "@/src/shared/context/layout-context";
import { Header } from "@/src/shared/components/header";
import { Sidebar } from "@/src/features/sidebar/components/sidebar";
import { AuthSection } from "@/src/features/auth/components/auth-section";
import { useAuth } from "@/src/features/auth/hooks/use-auth";
import { useChannels } from "@/src/features/channels/hooks/use-channels";

import appCss from "./globals.css?url";

function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				refetchOnWindowFocus: true,
			},
		},
	});
}

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "draks-tv" },
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	component: RootComponent,
});

function RootComponent() {
	const [queryClient] = useState(createQueryClient);

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="bg-background text-text-primary">
				<QueryClientProvider client={queryClient}>
					<LayoutProvider>
						<AuthenticatedLayout />
					</LayoutProvider>
				</QueryClientProvider>
				<Scripts />
			</body>
		</html>
	);
}

function AuthenticatedLayout() {
	const { isAuthenticated, isLoading, error } = useAuth();

	if (isLoading) {
		return <LoadingScreen />;
	}

	if (error !== null) {
		return <ErrorScreen message={error.message} />;
	}

	if (!isAuthenticated) {
		return <UnauthenticatedShell />;
	}

	return <AppShell />;
}

function LoadingScreen() {
	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="flex items-center text-text-dim">
				<span>Loading</span>
				<span className="ml-3 w-6 h-6 border-2 border-surface-border-muted border-t-twitch-purple rounded-full animate-spin" />
			</div>
		</div>
	);
}

function ErrorScreen({ message }: { message: string }) {
	return (
		<div className="min-h-screen flex items-center justify-center">
			<p className="text-live text-sm">{message}</p>
		</div>
	);
}

function UnauthenticatedShell() {
	return (
		<div className="min-h-screen">
			<header className="flex justify-between items-center px-6 py-4 bg-surface-card border-b border-surface-border">
				<h1 className="text-xl font-bold text-twitch-purple tracking-tight">draks-tv</h1>
			</header>
			<main className="p-6 max-w-[1600px] mx-auto">
				<AuthSection />
			</main>
		</div>
	);
}

// Static class mappings for Tailwind detection
const sidebarMargins = {
	open: "ml-72",
	closed: "ml-16",
} as const;

function AppShell() {
	const { isSidebarOpen, toggleSidebar } = useLayout();
	const { isFetching, refetch } = useChannels();

	function handleRefresh() {
		refetch();
	}

	const marginClass = isSidebarOpen ? sidebarMargins.open : sidebarMargins.closed;

	return (
		<div className="min-h-screen bg-background">
			<Sidebar isExpanded={isSidebarOpen} onToggle={toggleSidebar} />

			<div className={`transition-[margin] duration-300 ${marginClass}`}>
				<Header
					onAddChannel={() => {
						/* TODO: modal handling via route or context */
					}}
					onRefresh={handleRefresh}
					onToggleSidebar={toggleSidebar}
					isRefreshing={isFetching}
				/>

				<main className="p-6 max-w-7xl mx-auto">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
