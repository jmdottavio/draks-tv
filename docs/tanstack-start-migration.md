# TanStack Start Migration Plan

Migrate draks-tv from Vite + Express to TanStack Start with Drizzle ORM, following homeschool project patterns.

## Overview

**Current**: Vite (9442) + Express (9443) with raw SQL
**Target**: TanStack Start (unified 9442) with Drizzle ORM + file-based routing

---

## Phase 1: Project Setup

### 1.1 Install Dependencies

```bash
bun add @tanstack/react-router @tanstack/react-start drizzle-orm
bun add -d drizzle-kit vite-tsconfig-paths
```

### 1.2 Update vite.config.ts

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

### 1.3 Update package.json Scripts

```json
{
  "scripts": {
    "dev": "bunx --bun vite dev",
    "build": "vite build",
    "start": "node .output/server/index.mjs",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

### 1.4 Create drizzle.config.ts

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: "./data/draks-tv.db" },
});
```

---

## Phase 2: Drizzle ORM Setup

### 2.1 Create src/db/schema.ts

```typescript
import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const auth = sqliteTable("auth", {
  id: integer("id").primaryKey(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  userId: text("user_id"),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const favorites = sqliteTable(
  "favorites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    twitchId: text("twitch_id").unique().notNull(),
    login: text("login").notNull(),
    displayName: text("display_name").notNull(),
    profileImage: text("profile_image").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("favorites_sort_order_idx").on(table.sortOrder)]
);

export const channelLastSeen = sqliteTable("channel_last_seen", {
  twitchId: text("twitch_id").primaryKey(),
  login: text("login").notNull(),
  displayName: text("display_name").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// Type exports
export type Auth = typeof auth.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type ChannelLastSeen = typeof channelLastSeen.$inferSelect;
```

### 2.2 Create src/db/index.ts

```typescript
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

let drizzleInstance: ReturnType<typeof drizzle> | null = null;

function getDatabase() {
  if (drizzleInstance === null) {
    const sqlite = new Database("./data/draks-tv.db");
    drizzleInstance = drizzle(sqlite, { schema });
  }
  return drizzleInstance;
}

export const database = getDatabase();
```

### 2.3 Migrate Database Modules

Convert raw SQL to Drizzle queries in:
- `src/server/database/auth.ts` → `src/db/repositories/auth-repository.ts`
- `src/server/database/favorites.ts` → `src/db/repositories/favorites-repository.ts`
- `src/server/database/channel-last-seen.ts` → `src/db/repositories/channel-last-seen-repository.ts`

**Pattern for batch upserts** (channel-last-seen):
```typescript
function batchSetLastSeenFromVod(channels: Array<ChannelInput>) {
  try {
    database.transaction((transaction) => {
      for (const channel of channels) {
        transaction.insert(channelLastSeen)
          .values({ twitchId: channel.id, login: channel.login, displayName: channel.displayName, lastSeenAt: channel.vodDate })
          .onConflictDoUpdate({
            target: channelLastSeen.twitchId,
            set: {
              lastSeenAt: sql`CASE WHEN excluded.last_seen_at > ${channelLastSeen.lastSeenAt} THEN excluded.last_seen_at ELSE ${channelLastSeen.lastSeenAt} END`,
            },
          })
          .run();
      }
    });
    return null;
  } catch (error) {
    return new Error(`Failed to batch update: ${error}`);
  }
}
```

**Pattern for reorder transactions**:
```typescript
function reorderFavorites(orderedIds: Array<string>) {
  try {
    database.transaction((transaction) => {
      for (let index = 0; index < orderedIds.length; index++) {
        const twitchId = orderedIds[index];
        if (twitchId !== undefined) {
          transaction.update(favorites)
            .set({ sortOrder: index })
            .where(eq(favorites.twitchId, twitchId))
            .run();
        }
      }
    });
    return null;
  } catch (error) {
    return new Error(`Failed to reorder favorites: ${error}`);
  }
}
```

---

## Phase 3: File-Based Routing Setup

### 3.1 Target Directory Structure

```
src/
├── app/                              # File-based routes
│   ├── __root.tsx                   # Root layout + providers
│   ├── index.tsx                    # / (channels view)
│   ├── vods.tsx                     # /vods
│   ├── channels/
│   │   └── $channelId.tsx           # /channels/:id (future)
│   └── api/
│       ├── auth/
│       │   ├── status.ts            # GET /api/auth/status
│       │   ├── url.ts               # GET /api/auth/url
│       │   ├── callback.ts          # GET /api/auth/callback
│       │   └── logout.ts            # POST /api/auth/logout
│       ├── channels/
│       │   ├── index.ts             # GET /api/channels
│       │   └── followed.ts          # GET /api/channels/followed
│       ├── favorites/
│       │   ├── index.ts             # POST /api/favorites
│       │   ├── reorder.ts           # PUT /api/favorites/reorder
│       │   └── toggle/
│       │       └── $id.ts           # POST /api/favorites/toggle/:id
│       ├── users.ts                 # GET /api/users
│       ├── videos.ts                # GET /api/videos
│       └── watch/
│           ├── live/
│           │   └── $channel.ts      # POST /api/watch/live/:channel
│           └── vod/
│               └── $id.ts           # POST /api/watch/vod/:id
├── db/                               # Drizzle ORM
│   ├── index.ts
│   ├── schema.ts
│   └── repositories/
├── features/                         # Feature modules (optional refactor)
├── shared/
│   ├── components/                  # Move from src/client/components
│   ├── hooks/                       # Move from src/client/hooks
│   ├── lib/                         # Move from src/client/lib
│   └── utils/
│       ├── api-response.ts          # jsonResponse, errorResponse helpers
│       └── parse-request-body.ts    # Body validation
└── services/                         # Move from src/server/services
    ├── twitch-service.ts
    └── streamlink-service.ts
```

### 3.2 Create src/app/__root.tsx

```typescript
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Sidebar } from "@/shared/components/sidebar";
import { Header } from "@/shared/components/header";
import { AuthSection } from "@/shared/components/auth-section";
import { useAuth } from "@/shared/hooks/use-auth";
import { LayoutProvider, useLayout } from "@/shared/context/layout-context";

import appCss from "./globals.css?url";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

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
  const { data: authData, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!authData?.authenticated) {
    return <UnauthenticatedShell />;
  }

  return <AppShell />;
}

function UnauthenticatedShell() {
  return (
    <div className="min-h-screen">
      <header className="flex justify-between items-center px-6 py-4 bg-surface-card border-b border-surface-border">
        <h1 className="text-xl font-bold text-twitch-purple">draks-tv</h1>
      </header>
      <main className="p-6 max-w-[1600px] mx-auto">
        <AuthSection />
      </main>
    </div>
  );
}

function AppShell() {
  const { isSidebarOpen, toggleSidebar } = useLayout();

  return (
    <div className="min-h-screen">
      <Sidebar isExpanded={isSidebarOpen} onToggle={toggleSidebar} />
      <div className={`transition-[margin] duration-300 ${isSidebarOpen ? "lg:ml-72" : "lg:ml-[72px]"}`}>
        <Header onToggleSidebar={toggleSidebar} />
        <main className="p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### 3.3 Create Layout Context

**File**: `src/shared/context/layout-context.tsx`

```typescript
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface LayoutContextValue {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

function getSavedSidebarState(): boolean {
  if (typeof window === "undefined") return false;
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
```

---

## Phase 4: Migrate API Routes

### 4.1 API Route Pattern

**Example**: `src/app/api/channels/index.ts`

```typescript
import { createAPIFileRoute } from "@tanstack/react-start/api";

import { getAuth } from "@/db/repositories/auth-repository";
import { getAllFavorites } from "@/db/repositories/favorites-repository";
import { getFollowedStreams, getUsers, getVideos } from "@/services/twitch-service";

export const Route = createAPIFileRoute("/api/channels")({
  GET: async () => {
    const auth = getAuth();

    if (auth.userId === null) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    const favorites = getAllFavorites();
    if (favorites instanceof Error) {
      return new Response(JSON.stringify({ error: favorites.message }), { status: 500 });
    }

    // ... rest of logic from current channels.ts route

    return Response.json(channels);
  },
});
```

### 4.2 Routes to Migrate

| Current Express Route | TanStack Start File |
|-----------------------|---------------------|
| GET `/api/auth/status` | `src/app/api/auth/status.ts` |
| GET `/api/auth/url` | `src/app/api/auth/url.ts` |
| GET `/callback` | `src/app/api/auth/callback.ts` (with redirect) |
| POST `/api/auth/logout` | `src/app/api/auth/logout.ts` |
| GET `/api/channels` | `src/app/api/channels/index.ts` |
| GET `/api/channels/followed` | `src/app/api/channels/followed.ts` |
| POST `/api/favorites` | `src/app/api/favorites/index.ts` |
| POST `/api/favorites/toggle/:id` | `src/app/api/favorites/toggle/$id.ts` |
| PUT `/api/favorites/reorder` | `src/app/api/favorites/reorder.ts` |
| GET `/api/users` | `src/app/api/users.ts` |
| GET `/api/videos` | `src/app/api/videos.ts` |
| POST `/api/watch/live/:channel` | `src/app/api/watch/live/$channel.ts` |
| POST `/api/watch/vod/:id` | `src/app/api/watch/vod/$id.ts` |

### 4.3 OAuth Callback Special Handling

The callback must redirect to `/` after storing tokens:

```typescript
// src/app/api/auth/callback.ts
export const Route = createAPIFileRoute("/api/auth/callback")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (code === null) {
      return new Response("Missing code", { status: 400 });
    }

    // Exchange code for tokens...
    // Store in database...

    return Response.redirect(new URL("/", request.url).toString(), 302);
  },
});
```

---

## Phase 5: Migrate Frontend Routes

### 5.1 Create Page Routes

**src/app/index.tsx** (channels view):
```typescript
import { createFileRoute } from "@tanstack/react-router";
import { ChannelGrid } from "@/shared/components/channel-grid";

export const Route = createFileRoute("/")({
  component: ChannelsPage,
});

function ChannelsPage() {
  return <ChannelGrid />;
}
```

**src/app/vods.tsx**:
```typescript
import { createFileRoute } from "@tanstack/react-router";
import { VodsSection } from "@/shared/components/vods-section";

export const Route = createFileRoute("/vods")({
  component: VodsPage,
});

function VodsPage() {
  return <VodsSection />;
}
```

### 5.2 Update Navigation

Replace state-based navigation with Link components:

**Header.tsx changes:**
```typescript
// Before
<button onClick={onShowVods}>VODs</button>

// After
import { Link } from "@tanstack/react-router";
<Link to="/vods">VODs</Link>
```

**VodsSection.tsx changes:**
```typescript
// Before
<button onClick={onBack}>Back</button>

// After
import { Link } from "@tanstack/react-router";
<Link to="/">Back</Link>
```

---

## Phase 6: Cleanup

### 6.1 Files to Delete

- `src/server/index.ts` (Express server)
- `src/server/routes/` (entire directory)
- `src/server/database/` (replaced by Drizzle repositories)
- `src/client/main.tsx` (handled by __root.tsx)
- `src/client/app.tsx` (split into routes)

### 6.2 Files to Move/Rename

- `src/client/components/` → `src/shared/components/`
- `src/client/hooks/` → `src/shared/hooks/`
- `src/client/lib/` → `src/shared/lib/`
- `src/server/services/` → `src/services/`

### 6.3 Update Documentation

- Update `CLAUDE.md` to reflect new project structure
- Update `knowledge/PROJECT.md` with new patterns

---

## Verification Checklist

After migration, verify:

- [ ] `bun run dev` starts single server on port 9442
- [ ] OAuth login flow works (redirects to Twitch, callback stores tokens)
- [ ] `/api/auth/status` returns authenticated state
- [ ] Channels load on home page (favorites + followed)
- [ ] Sidebar shows all followed channels with live/offline status
- [ ] Clicking live channel launches stream via Streamlink
- [ ] Favorites toggle works (star button)
- [ ] Drag-and-drop reorder works for favorites
- [ ] `/vods` route works with search
- [ ] Browser back button works between routes
- [ ] URL updates on navigation
- [ ] Sidebar state persists across page refreshes
- [ ] `bun run build` produces working production build

---

## Error Handling Standards

### Result Pattern (Server-Side / Repositories / Services)

Return `T | Error` instead of throwing for server-side code. **CRITICAL: Do NOT add explicit return types** - let TypeScript infer them so missing return paths are caught at compile time:

```typescript
// GOOD - No explicit return type, TypeScript infers Array<Favorite> | Error
function getAllFavorites() {
  try {
    const rows = database.select().from(favorites).orderBy(asc(favorites.sortOrder)).all();
    return rows;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return new Error(`Failed to get favorites: ${message}`);
  }
}

// BAD - Explicit return type hides missing return paths
function getAllFavorites(): Array<Favorite> | Error {
  // TypeScript won't catch if you forget a return statement
}

// Usage in API handlers - TypeScript narrows after the instanceof check
const favoritesResult = getAllFavorites();
if (favoritesResult instanceof Error) {
  return new Response(JSON.stringify({ error: favoritesResult.message }), { status: 500 });
}
// favoritesResult is now narrowed to Array<Favorite>
```

### Exception: React Query Functions MUST Throw

Query functions used with `useQuery` and `useMutation` must **throw errors** so they propagate to `onError` callbacks properly:

```typescript
// In src/shared/lib/api.ts - these functions THROW, not return Error

async function fetchChannels() {
  const response = await fetch("/api/channels");

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorData.error ?? `Failed to fetch channels: ${response.status}`);
  }

  return response.json();
}

async function toggleFavorite(channelId: string) {
  const response = await fetch(`/api/favorites/toggle/${channelId}`, { method: "POST" });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(errorData.error ?? "Failed to toggle favorite");
  }

  return response.json();
}

// Usage in hooks - errors propagate to onError
function useChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: fetchChannels,  // Throws on error, caught by React Query
  });
}

function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleFavorite,  // Throws on error
    onError: (error) => {
      // Error is caught here because mutationFn threw
      console.error("Toggle favorite failed:", error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}
```

### Summary: When to Throw vs Return Error

| Location | Pattern | Return Type | Reason |
|----------|---------|-------------|--------|
| Database repositories | Return Error on failure | **Inferred** (never explicit) | TypeScript catches missing returns |
| Services (twitch-service) | Return Error on failure | **Inferred** (never explicit) | TypeScript catches missing returns |
| API route handlers | Check `instanceof Error`, return Response | **Inferred** (never explicit) | TypeScript catches missing returns |
| React Query `queryFn` | **Throw** on failure | **Inferred** | React Query catches and passes to `onError` |
| React Query `mutationFn` | **Throw** on failure | **Inferred** | React Query catches and passes to `onError` |

---

## Key Pitfalls to Avoid

1. **Don't use route loaders for data** - Keep TanStack Query hooks, they have optimistic updates
2. **NEVER add explicit return types** - Let TypeScript infer ALL return types so missing return paths are caught at compile time. This applies to API handlers, repositories, services, and all other functions.
3. **Don't chain array methods** - Use intermediate variables per code standards
4. **Don't use `any`** - Use `unknown` with validation
5. **Use transactions for multi-row updates** - Don't mix database and transaction inside transactions
6. **Keep result pattern for server code** - Return Error on failure (inferred type will be `T | Error`), except React Query functions
7. **React Query functions MUST throw** - So errors propagate to `onError` properly
8. **No abbreviations in code** - Use `transaction` not `tx`, `database` not `db`, `previous` not `prev`, `index` not `idx` in variable names

---

## Migration Order

1. Phase 1: Project setup (dependencies, configurations)
2. Phase 2: Drizzle ORM (schema, repositories)
3. Phase 3: Root layout + layout context
4. Phase 4: API routes (auth first, then channels, then rest)
5. Phase 5: Frontend routes + navigation updates
6. Phase 6: Cleanup old files, update documentation
