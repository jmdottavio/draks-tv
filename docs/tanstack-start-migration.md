# TanStack Start Migration Plan

Migrate from Vite + Express SPA to TanStack Start, adopting the homeschool project's tech stack.

## Why Migrate

Current architecture problems:
- No URL-based routing (clicking channels doesn't update URL)
- Browser back button doesn't work for navigation
- Running two servers (Vite on 9442, Express on 9443)
- Manual API route registration in Express
- Raw SQL queries with manual type definitions

## Target Tech Stack

Adopt the homeschool project's stack entirely:
- **TanStack Start** - Unified full-stack framework with file-based routing
- **TanStack Router** - Type-safe routing with auto-generated route tree
- **TanStack Query** - Data fetching and caching (already using)
- **Drizzle ORM** - Type-safe database with migrations
- **Tailwind CSS v4** - Styling via Vite plugin (already using)
- **Bun** - Runtime and package manager (already using)

## Reference Project

Use `C:\Users\STRIX\Documents\GitHub\homeschool` as the reference implementation:
- File-based routing in `src/app/`
- API routes in `src/app/api/`
- Drizzle ORM singleton in `src/db/`
- Feature modules in `src/features/`
- Shared utilities in `src/shared/`

## Target Structure

```
draks-tv/
├── src/
│   ├── app/                          # File-based routes
│   │   ├── __root.tsx               # Root layout (providers, head tags)
│   │   ├── index.tsx                # Home page (/)
│   │   ├── vods/
│   │   │   └── index.tsx            # /vods page
│   │   ├── channels/
│   │   │   └── $channelId/
│   │   │       └── index.tsx        # /channels/:channelId detail page
│   │   └── api/                     # API endpoints
│   │       ├── auth/
│   │       │   ├── status/index.ts  # GET /api/auth/status
│   │       │   ├── url/index.ts     # GET /api/auth/url
│   │       │   ├── callback/index.ts # GET /api/auth/callback (OAuth)
│   │       │   └── logout/index.ts  # POST /api/auth/logout
│   │       ├── channels/
│   │       │   ├── index.ts         # GET /api/channels
│   │       │   └── followed/index.ts # GET /api/channels/followed
│   │       ├── favorites/
│   │       │   ├── index.ts         # GET/POST /api/favorites
│   │       │   ├── reorder/index.ts # PUT /api/favorites/reorder
│   │       │   └── $id/index.ts     # DELETE /api/favorites/:id
│   │       ├── watch/
│   │       │   ├── live/$channel/index.ts  # POST /api/watch/live/:channel
│   │       │   └── vod/$id/index.ts        # POST /api/watch/vod/:id
│   │       └── vods/
│   │           └── search/index.ts  # GET /api/vods/search
│   │
│   ├── features/                    # Feature modules (optional restructure)
│   │   ├── auth/
│   │   ├── channels/
│   │   ├── favorites/
│   │   └── vods/
│   │
│   ├── db/
│   │   ├── index.ts                 # Drizzle singleton (bun:sqlite)
│   │   └── schema.ts                # Drizzle schema definitions
│   │
│   ├── shared/
│   │   ├── components/              # Shared UI components
│   │   ├── hooks/                   # Shared hooks
│   │   └── utils/                   # Utilities
│   │
│   ├── services/
│   │   ├── twitch-service.ts        # Twitch API wrapper
│   │   └── streamlink-service.ts    # Streamlink launcher
│   │
│   └── router.tsx                   # Router configuration
│
├── vite.config.ts                   # TanStack Start + Tailwind v4
├── drizzle.config.ts                # Drizzle migrations config
└── data/                            # SQLite database file
```

## Migration Steps

### Phase 1: Project Setup

1. Install dependencies:
   ```bash
   bun add @tanstack/react-router @tanstack/react-start drizzle-orm
   bun add -D vite-tsconfig-paths drizzle-kit
   ```

2. Update `vite.config.ts`:
   ```typescript
   import { defineConfig } from "vite";
   import { tanstackStart } from "@tanstack/react-start/plugin/vite";
   import viteReact from "@vitejs/plugin-react";
   import tsconfigPaths from "vite-tsconfig-paths";
   import tailwindcss from "@tailwindcss/vite";

   export default defineConfig({
     server: { port: 9442 },
     plugins: [
       tailwindcss(),
       tsconfigPaths(),
       tanstackStart({
         srcDirectory: "src",
         router: { routesDirectory: "app" },
       }),
       viteReact(),
     ],
   });
   ```

3. Create `src/app/__root.tsx` with providers

4. Update `package.json` scripts:
   ```json
   {
     "scripts": {
       "dev": "bunx --bun vite dev",
       "build": "vite build",
       "start": "node .output/server/index.mjs"
     }
   }
   ```

### Phase 2: Set Up Drizzle ORM

1. Create `src/db/schema.ts` with table definitions (see Drizzle ORM Setup section)
2. Create `src/db/index.ts` with database singleton
3. Create `drizzle.config.ts`
4. Run `bun run db:push` to sync schema with existing database
5. Update API handlers to use Drizzle queries instead of raw SQL

**Before** (raw SQL):
```typescript
const row = db.query('SELECT * FROM auth WHERE id = 1').get();
```

**After** (Drizzle):
```typescript
const row = await db.select().from(auth).where(eq(auth.id, 1)).get();
```

### Phase 3: Migrate API Routes

Convert Express routes to TanStack Start file-based API routes.

**Before** (`src/server/routes/auth.ts`):
```typescript
router.get('/status', (req, res) => {
  const auth = getAuth();
  res.json({ authenticated: auth.accessToken !== null });
});
```

**After** (`src/app/api/auth/status/index.ts`):
```typescript
import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "@/db/auth";

export const Route = createFileRoute("/api/auth/status/")({
  server: {
    handlers: {
      GET: async (): Promise<Response> => {
        const auth = getAuth();
        return Response.json({
          authenticated: auth.accessToken !== null,
          userId: auth.userId,
        });
      },
    },
  },
});
```

**Order of migration:**
1. `/api/auth/*` - Authentication endpoints
2. `/api/channels/*` - Channel data endpoints
3. `/api/favorites/*` - Favorites management
4. `/api/watch/*` - Streamlink launch endpoints
5. `/api/vods/*` - VOD search

### Phase 4: Migrate Frontend Routes

1. Move main page to `src/app/index.tsx`
2. Create `src/app/vods/index.tsx` for VODs search
3. Create `src/app/channels/$channelId/index.tsx` for channel detail
4. Update navigation to use TanStack Router's `<Link>` component

### Phase 5: Update Client Code

1. Update API fetch paths (should remain the same `/api/...`)
2. Keep TanStack Query hooks (they work identically)
3. Update navigation from state-based to router-based:
   ```typescript
   // Before (state-based)
   setCurrentView('vods');

   // After (router-based)
   navigate({ to: '/vods' });
   ```

### Phase 6: Cleanup

1. Remove Express server code (`src/server/index.ts`, routes)
2. Remove dual-port configuration
3. Update CLAUDE.md with new structure
4. Test all functionality

## Drizzle ORM Setup

### Schema Definition (`src/db/schema.ts`)
```typescript
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const auth = sqliteTable("auth", {
  id: integer("id").primaryKey(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  userId: text("user_id"),
  updatedAt: text("updated_at"),
});

export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  twitchId: text("twitch_id").unique().notNull(),
  login: text("login").notNull(),
  displayName: text("display_name").notNull(),
  profileImage: text("profile_image").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: text("created_at"),
});

export const channelLastSeen = sqliteTable("channel_last_seen", {
  twitchId: text("twitch_id").primaryKey(),
  login: text("login").notNull(),
  displayName: text("display_name").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  updatedAt: text("updated_at"),
});

// Type exports
export type Auth = typeof auth.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type ChannelLastSeen = typeof channelLastSeen.$inferSelect;
```

### Database Singleton (`src/db/index.ts`)
```typescript
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const sqlite = new Database("./data/draks-tv.db");
export const db = drizzle(sqlite, { schema });
```

### Drizzle Config (`drizzle.config.ts`)
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: "./data/draks-tv.db" },
});
```

### Package.json Scripts
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## OAuth Callback Consideration

The Twitch OAuth callback (`/callback`) must redirect properly. In TanStack Start:
- Create `src/app/callback/index.tsx` as a page route (not API)
- Or handle in `src/app/api/auth/callback/index.ts` with redirect response

## Testing Checklist

- [ ] OAuth login flow works
- [ ] Token refresh works on 401
- [ ] Logout clears auth
- [ ] Channels load (favorites + followed)
- [ ] Sidebar shows all followed channels
- [ ] Clicking live channel launches stream
- [ ] Clicking offline channel shows detail page
- [ ] URL updates on navigation
- [ ] Browser back button works
- [ ] VODs search works
- [ ] Favorites toggle works
- [ ] Drag-and-drop reorder works
- [ ] Production build works

## Rollback Plan

Keep the current working code in a branch before starting migration:
```bash
git checkout -b pre-tanstack-start-backup
git checkout dev
```
