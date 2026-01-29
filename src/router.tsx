import { createRouter, Link } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function NotFound() {
	return (
		<div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
			<h1 className="text-4xl font-bold">404</h1>
			<p className="text-text-secondary">Page not found</p>
			<Link to="/" className="text-twitch-purple hover:underline">
				Go home
			</Link>
		</div>
	);
}

export function getRouter() {
	const router = createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultNotFoundComponent: NotFound,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
