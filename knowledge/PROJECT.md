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

Route handlers in `src/app/api/`. Uses TanStack Start API routes:

```typescript
import { createAPIFileRoute } from "@tanstack/start/api";

export const Route = createAPIFileRoute("/api/channels")({
	GET: async ({ request }) => {
		return new Response(JSON.stringify({ message: "Hello" }));
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
