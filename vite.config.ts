import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	server: {
		port: 9442,
	},
	plugins: [
		// Order matters! Tailwind first, then paths, then start, then react
		tailwindcss(),
		tsconfigPaths(),
		tanstackStart({
			srcDirectory: "src",
			router: {
				routesDirectory: "app",
			},
		}),
		viteReact(),
	],
});
