# TanStack Start Migration Plan

Migrate draks-tv from Vite + Express to TanStack Start with Drizzle ORM, following homeschool project patterns.

## Overview

**Current**: TanStack Start (unified 9442) with Drizzle ORM + file-based routing
**Status**: Migration complete - ready for testing

---

## Phase 1: Project Setup [DONE]

### 1.1 Install Dependencies [DONE]

```bash
bun add @tanstack/react-router @tanstack/react-start drizzle-orm
bun add -d drizzle-kit vite-tsconfig-paths
```

### 1.2 Update vite.config.ts [DONE]

Matches homeschool exactly - no tsr.config.json needed:

```typescript
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: { port: 9442 },
  plugins: [
    // Order matters! Tailwind first, then paths, then start, then react
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

### 1.3 Update package.json Scripts [DONE]

Removed Express, concurrently, and all related scripts:

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

### 1.4 Create drizzle.config.ts [DONE]

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: "./data/draks-tv.db" },
  verbose: true,
  strict: true,
});
```

### 1.5 Update tsconfig.json [DONE]

Matches homeschool exactly with `@/*` → `./*` paths:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", "**/*.mts", "src/routeTree.gen.ts"]
}
```

---

## Phase 2: Drizzle ORM Setup [DONE]

### 2.1 Create src/db/schema.ts [DONE]

### 2.2 Create src/db/index.ts [DONE]

### 2.3 Migrate Database Modules [DONE]

Created Drizzle repositories:
- `src/db/repositories/auth-repository.ts`
- `src/db/repositories/favorites-repository.ts`
- `src/db/repositories/channel-last-seen-repository.ts`

---

## Phase 3: File-Based Routing Setup [DONE]

### 3.1 Directory Structure [DONE]

```
src/
├── app/                    # File-based routes
│   ├── __root.tsx          # Root layout + providers
│   ├── globals.css         # Global styles
│   ├── index.tsx           # / (channels view)
│   └── vods.tsx            # /vods
├── db/                     # Drizzle ORM
│   ├── index.ts
│   ├── schema.ts
│   └── repositories/
├── router.tsx              # Router config with NotFound
├── routeTree.gen.ts        # Auto-generated
├── services/               # Business logic
│   ├── twitch-service.ts
│   └── streamlink-service.ts
└── shared/
    ├── components/         # React components
    ├── context/            # Layout context
    ├── hooks/              # Custom hooks
    └── lib/                # Utilities
```

### 3.2 Create src/app/__root.tsx [DONE]

### 3.3 Create Layout Context [DONE]

File: `src/shared/context/layout-context.tsx`

### 3.4 Create src/router.tsx [DONE]

Matches homeschool pattern with NotFound component.

---

## Phase 4: Migrate API Routes [DONE]

### 4.1 API Route Pattern

Uses `createFileRoute` with `server.handlers`:

```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/channels/")({
  server: {
    handlers: {
      GET: async () => {
        // handler code
        return Response.json(data);
      },
    },
  },
});
```

### 4.2 Routes Created

| API Route | File | Status |
|-----------|------|--------|
| GET `/api/auth/status` | `src/app/api/auth/status/index.ts` | DONE |
| GET `/api/auth/url` | `src/app/api/auth/url/index.ts` | DONE |
| GET `/api/auth/callback` | `src/app/api/auth/callback/index.ts` | DONE |
| POST `/api/auth/logout` | `src/app/api/auth/logout/index.ts` | DONE |
| GET `/api/channels` | `src/app/api/channels/index.ts` | DONE |
| GET `/api/channels/followed` | `src/app/api/channels/followed/index.ts` | DONE |
| POST `/api/favorites` | `src/app/api/favorites/index.ts` | DONE |
| POST `/api/favorites/toggle/:id` | `src/app/api/favorites/toggle/$id/index.ts` | DONE |
| PUT `/api/favorites/reorder` | `src/app/api/favorites/reorder/index.ts` | DONE |
| GET `/api/users` | `src/app/api/users/index.ts` | DONE |
| GET `/api/videos` | `src/app/api/videos/index.ts` | DONE |
| POST `/api/watch/live/:channel` | `src/app/api/watch/live/$channel/index.ts` | DONE |
| POST `/api/watch/vod/:id` | `src/app/api/watch/vod/$id/index.ts` | DONE |

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

## Phase 5: Migrate Frontend Routes [DONE]

### 5.1 Create Page Routes [DONE]

- `src/app/index.tsx` - channels view
- `src/app/vods.tsx` - VODs view

### 5.2 Update Navigation [DONE]

- `header.tsx` - already using `<Link>` components
- `vods-section.tsx` - updated to use `<Link to="/">` instead of callback prop

---

## Phase 6: Cleanup [DONE]

### 6.1 Files Deleted [DONE]

- `src/server/` (entire Express server directory)
- `src/client/` (old Vite client structure)
- `tsr.config.json` (not needed, config in vite.config.ts)

### 6.2 Files Moved [DONE]

- `src/client/components/` → `src/shared/components/`
- `src/client/hooks/` → `src/shared/hooks/`
- `src/client/lib/` → `src/shared/lib/`
- Services already at `src/services/`

### 6.3 Dependencies Removed [DONE]

- `express`
- `@types/express`
- `concurrently`

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
```

### Exception: React Query Functions MUST Throw

Query functions used with `useQuery` and `useMutation` must **throw errors** so they propagate to `onError` callbacks properly.

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
2. **NEVER add explicit return types** - Let TypeScript infer ALL return types so missing return paths are caught at compile time
3. **Don't chain array methods** - Use intermediate variables per code standards
4. **Don't use `any`** - Use `unknown` with validation
5. **Use transactions for multi-row updates** - Don't mix database and transaction inside transactions
6. **Keep result pattern for server code** - Return Error on failure (inferred type will be `T | Error`), except React Query functions
7. **React Query functions MUST throw** - So errors propagate to `onError` properly
8. **No abbreviations in code** - Use `transaction` not `tx`, `database` not `db`, `previous` not `prev`, `index` not `idx` in variable names

---

## Next Steps

1. Run `bun install` to ensure dependencies are up to date
2. Run `bun run dev` and verify everything works
3. Test the verification checklist above
