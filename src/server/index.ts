import express from "express";
import { resolve } from "path";

import { authRouter } from "./routes/auth";
import { channelsRouter } from "./routes/channels";
import { watchRouter } from "./routes/watch";

// Initialize database (runs schema creation)
import "./database/schema";

const app = express();
app.use(express.json());

const PORT = process.env.PORT ?? "9442";

// Auth routes
app.use("/api/auth", authRouter);
app.get("/callback", authRouter);

// Channel and favorites routes
app.use("/api", channelsRouter);

// Watch routes
app.use("/api/watch", watchRouter);

// Serve static files in production
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
	const clientPath = resolve(import.meta.dir, "../../dist/client");
	app.use(express.static(clientPath));
}

app.listen(Number(PORT), () => {
	console.log(`draks-tv running at http://localhost:${PORT}`);
});
