import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { APP_PORT } from "./src/shared/utils/server-config";

export default defineConfig({
	server: {
		port: APP_PORT,
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
