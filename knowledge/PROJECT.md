# Project Standards

## Package Manager

Use Bun for all package operations:

```bash
bun install           # Install dependencies
bun add <package>     # Add dependency
bun run dev           # Run development server
bun run build         # Build for production
```

## API Routes

Route handlers in `src/app/api/`. Uses TanStack Start with server handlers:

```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/channels/")({
	server: {
		handlers: {
			GET: async function handler() {
				return Response.json({ message: "Hello" });
			},
			POST: async ({ request }) => {
				const body = await request.json();
				return Response.json({ success: true }, { status: 201 });
			},
		},
	},
});
```

## Database

SQLite via Drizzle ORM. Database file stored in `data/draks-tv.db`.

Schema defined in `src/db/schema.ts`:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const favorites = sqliteTable("favorites", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	twitchId: text("twitch_id").notNull().unique(),
	// ...
});
```

## Environment Variables

Required variables in `.env`:

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `PORT`

## File Organization

```
src/
├── app/              # Routes & API (TanStack Start)
│   ├── api/
│   └── routes/
├── db/               # Drizzle ORM
│   ├── repositories/ # Data access
│   └── schema.ts
├── services/         # Domain logic (Twitch/Streamlink)
└── shared/           # Cross-cutting concerns
    ├── components/
    ├── hooks/
    └── lib/
```
