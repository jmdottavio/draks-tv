# VOD Caching System Implementation Plan

## Problem Statement

Currently, the main grid API (`/api/channels/`) fetches VODs fresh from Twitch for every offline favorite on every 60-second refetch. VODs are stable data that only change when a stream ends. This creates unnecessary API calls and slower load times.

Additionally:
- The `channel_last_seen` table exists but is never populated (`setLastSeenDate()` is never called)
- No way to detect when a channel goes offline to trigger VOD refresh
- Future VOD browsing page needs cached VOD data

## Solution Overview

Implement a **cache-first VOD system** with:
1. **`cached_vods` table** - Store full VOD metadata (multiple per channel for VOD browsing)
2. **`channel_cache` table** - Track live state + reference to latest VOD via FK (no duplication)
3. **TTL-based caching** - Return cached data if fresh (< 30 min), refresh in background if stale
4. **Immediate refresh on offline transition** - When a channel goes from live → offline, fetch new VOD immediately

**Critical Requirements:**
- **Live stream data is NEVER cached** - `getFollowedStreams()` hits Twitch API every request
- **Main page MUST refresh every 30 seconds** - For real-time live status updates (cannot be interfered with by caching)
- **VOD cache pre-populated on server start** - User never waits for initial cache population
- **Background 30-minute refresh task** - Keeps VOD cache fresh automatically

**Coding Standards Note:**
- Do NOT include explicit return types on functions - TypeScript will infer them
- All functions follow the `T | Error` return pattern (errors are returned, not thrown)
  - **Exception:** `useQuery`/`useMutation` fetch functions should throw errors so `onError` callbacks work properly (see `channels-queries.ts` for example)
- Use `Array<T>` syntax instead of `T[]`
- No abbreviations in variable/parameter names

## Database Schema Changes

### New Table: `channel_cache`
```typescript
channelCache = sqliteTable("channel_cache", {
    channelId: text("channel_id").primaryKey(),
    isLive: integer("is_live", { mode: "boolean" }).notNull().default(false),
    lastLiveAt: text("last_live_at"),  // When channel was last streaming (for channels without VODs)
    latestVodId: integer("latest_vod_id"),  // FK reference to cached_vods.id (nullable)
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
```

### New Table: `cached_vods`
```typescript
cachedVods = sqliteTable("cached_vods", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    vodId: text("vod_id").notNull().unique(),
    channelId: text("channel_id").notNull(),
    title: text("title").notNull(),
    duration: text("duration").notNull(),
    createdAt: text("created_at").notNull(),
    thumbnailUrl: text("thumbnail_url").notNull(),
    fetchedAt: text("fetched_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
    index("cached_vods_channel_id_idx").on(table.channelId),
    index("cached_vods_channel_created_idx").on(table.channelId, table.createdAt),
]);
```

### Main Page Query Pattern
```sql
SELECT c.*, v.*
FROM channel_cache c
LEFT JOIN cached_vods v ON c.latestVodId = v.id
WHERE c.channelId IN (...)
```
- Single JOIN on indexed FK - microseconds for ~50-200 channels
- No data duplication between tables

## New Files to Create

### 1. `src/features/vods/vods.repository.ts`
Repository functions for VOD cache CRUD (all return `T | Error` pattern):
```typescript
function getVodsForChannel(channelId: string, limit: number)
function upsertVod(vodData: VodInput)  // Returns row ID
function deleteOldVods(channelId: string, keepCount: number)
```

### 2. `src/features/vods/channel-cache.repository.ts`
Repository functions for channel cache (live state + latest VOD reference):
```typescript
function getChannelCache(channelId: string)
function getChannelCacheBulk(channelIds: Array<string>)
function getAllChannelCaches()
function upsertChannelCache(cacheData: ChannelCacheInput)
function getCacheAge(channelId: string)
```

### 3. `src/services/vod-cache-service.ts`
Service layer orchestrating cache logic:
```typescript
async function getChannelWithVod(channelId: string, options: CacheOptions)

async function getChannelsWithVods(channelIds: Array<string>, options: CacheOptions)

async function refreshVodsForChannel(channelId: string)

async function processLiveStateChanges(currentStreams: Array<TwitchStream>)
// Returns channelIds that went offline

async function populateInitialCache()

function startBackgroundRefresh()
```

### 4. `src/lib/startup.ts` (or integrate into existing server entry)
Server startup initialization:
- Called before server starts accepting requests
- Calls `populateInitialCache()` to fetch VODs for all favorites
- Calls `startBackgroundRefresh()` to schedule 30-minute refresh interval

## Files to Modify

### 1. `src/db/schema.ts`
Add `channelCache` and `cachedVods` table definitions.

### 2. `src/app/api/channels/index.ts`
Replace direct `getVideos()` calls with cache-first approach:
```
1. Fetch live streams from Twitch (unchanged - always fresh)
2. Call processLiveStateChanges() to detect offline transitions
   - Compare current live streams with channel_cache.isLive
   - For channels that went offline: update lastLiveAt, trigger VOD refresh
3. For offline favorites: use getChannelsWithVods() (cache-first)
   - Returns cached VOD via FK join
   - Refreshes in background if stale (> 30 min)
4. Return response with latestVod from cache
```

### 3. `src/app/api/channels/followed/index.ts`
Replace `lastSeenMap` usage with cached data:
- Use `channel_cache.lastLiveAt` for "when channel was last live"
- Use joined `cached_vods.createdAt` for "last VOD date"
- Remove dependency on unused `channel_last_seen` table

### 4. `src/features/vods/index.ts`
Export new repository functions from both repository files.

### 5. `src/features/channels/hooks/use-channels.ts`
Change `refetchInterval` from 60000 to 30000 (30 seconds) for live status updates.

### 6. Server entry point (TanStack Start config or app entry)
Add startup initialization to call `populateInitialCache()` and `startBackgroundRefresh()` before server accepts requests.

## Implementation Phases

### Phase 1: Schema & Migration
1. Add `channelCache` and `cachedVods` tables to `src/db/schema.ts`
2. Run `bun run drizzle-kit generate` to create migration
3. Verify migration runs on app startup

### Phase 2: VOD Repository
1. Create `src/features/vods/vods.repository.ts`
2. Implement `upsertVod()`, `getVodsForChannel()`, `deleteOldVods()`
3. Follow existing pattern from `favorites.repository.ts`

### Phase 3: Channel Cache Repository
1. Create `src/features/vods/channel-cache.repository.ts`
2. Implement `getChannelCacheBulk()` with LEFT JOIN to cached_vods
3. Implement `upsertChannelCache()` for updating isLive, lastLiveAt, latestVodId
4. Implement `getCacheAge()` using fetchedAt from joined VOD

### Phase 4: Cache Service
1. Create `src/services/vod-cache-service.ts`
2. Implement `processLiveStateChanges()`:
   - Load current cache states
   - Compare with live streams
   - Detect offline transitions (was live → now offline)
   - Update cache rows (isLive, lastLiveAt)
   - Return list of channels that went offline
3. Implement `refreshVodsForChannel()`:
   - Fetch VODs from Twitch via `getVideos()`
   - Upsert into `cached_vods`, get row ID
   - Update `channel_cache.latestVodId` FK
4. Implement `getChannelsWithVods()`:
   - Query cache via bulk repository function
   - Check TTL (30 min default)
   - Return cached data, trigger background refresh if stale

### Phase 5: Main Grid API Integration
1. Modify `src/app/api/channels/index.ts`
2. After fetching live streams, call `processLiveStateChanges()`
3. For offline favorites that just went offline → immediate `refreshVodsForChannel()`
4. For other offline favorites → `getChannelsWithVods()` (cache-first)
5. Replace `vodsByChannelId` map with data from cache

### Phase 6: Sidebar Update
1. Modify `src/app/api/channels/followed/index.ts`
2. Replace `lastSeenMap` with `channel_cache` data
3. Use `lastLiveAt` + joined VOD's `createdAt` for display

### Phase 7: Server Startup & Background Refresh
1. Create startup initialization (in `src/lib/startup.ts` or server entry)
2. Implement `populateInitialCache()`:
   - Get auth from database
   - Fetch all favorites
   - For each favorite: fetch VODs from Twitch, upsert into cache
   - Log progress so user sees cache warming up
3. Implement `startBackgroundRefresh()`:
   - Use `setInterval(refreshAllFavoriteVods, VOD_CACHE_TTL_MS)` (30 minutes)
   - Refresh runs in background, doesn't block requests
   - Log refresh activity for monitoring
4. Call both functions before server starts accepting requests

### Phase 8: Frontend 30-Second Refresh
1. Modify `src/features/channels/hooks/use-channels.ts`
2. Change `refetchInterval` from 60000 to 30000 (30 seconds)
3. This ensures live status is always fresh - never hits cache

## Configuration

```typescript
// Constants (in vod-cache-service.ts)
const VOD_CACHE_TTL_MS = 30 * 60 * 1000;      // 30 minutes - background refresh interval
const VODS_PER_CHANNEL_LIMIT = 5;              // Max VODs to store per channel
const LIVE_REFRESH_INTERVAL_MS = 30 * 1000;    // 30 seconds - frontend polling for live status
```

**Frontend change required:**
- `src/features/channels/hooks/use-channels.ts` - Change `refetchInterval` from 60000 to 30000 (30 seconds)

## Verification

1. **Startup cache population**: Start app → Logs should show "Populating VOD cache..." with progress before "Server ready"
2. **Instant cache hit**: Load main grid immediately after startup → VODs should appear instantly (no loading state for VODs)
3. **Live status refresh (30s)**: Open browser network tab → See `/api/channels` requests every 30 seconds
4. **Live status NOT cached**: When a channel goes live, it should appear live within 30 seconds of their stream starting
5. **Background refresh**: Check logs after 30 minutes → Should see "Background VOD refresh..." activity
6. **Went offline detection**:
   - Have a channel go live (or mock it)
   - When they go offline, VOD should refresh immediately (logged)
7. **Sidebar**: Verify `lastVodDate` displays correctly for offline channels
8. **Error handling**: Disconnect network → Should return stale cached VOD data gracefully (live status will fail though)

## Critical Files Reference

- `src/db/schema.ts` - Add new table definitions
- `src/app/api/channels/index.ts` - Main grid API (lines 138-163 have current VOD fetching to replace)
- `src/app/api/channels/followed/index.ts` - Sidebar API (uses lastSeenMap to replace)
- `src/features/channels/favorites.repository.ts` - Pattern reference for repositories
- `src/services/twitch-service.ts` - `getVideos()` function that cache service will use
- `src/features/sidebar/channel-last-seen.repository.ts` - Will be deprecated (keep table for now, stop using)

## Data Flow Summary

### Server Startup (Before Accepting Requests)
```
Server starts
    ↓
populateInitialCache():
  - Fetch all favorites from DB
  - For each: getVideos() from Twitch → upsert to cached_vods → update channel_cache FK
  - Log: "VOD cache populated for N channels"
    ↓
startBackgroundRefresh():
  - setInterval(refreshAllFavoriteVods, 30 minutes)
    ↓
Server ready to accept requests (cache is warm)
```

### Per-Request Flow (Every 30 Seconds from Frontend)
```
Request comes in
    ↓
Fetch live streams from Twitch (ALWAYS FRESH - never cached)
    ↓
processLiveStateChanges():
  - Compare current streams vs channel_cache.isLive
  - Channels that went offline → update lastLiveAt, trigger immediate VOD refresh
    ↓
For channels that just went offline:
  - getVideos() from Twitch (immediate, not cached)
  - upsertVod() → update channel_cache.latestVodId FK
    ↓
For other offline favorites:
  - getChannelCacheBulk() (uses cached VOD via JOIN)
  - Cache is ALWAYS warm due to startup + background refresh
    ↓
Build response:
  - Live status: FRESH from Twitch
  - VOD data: FROM CACHE (pre-populated + background refreshed)
```

### Background Refresh (Every 30 Minutes)
```
Timer fires
    ↓
For each favorite channel:
  - getVideos() from Twitch
  - upsertVod() → update FK if new VOD
  - Log: "Refreshed VODs for N channels"
    ↓
Cache stays fresh without user ever waiting
```

---

## Performance Recommendations (Frontend Perf Audit)

The following recommendations were identified by performance audits to maximize Core Web Vitals and rendering efficiency.

### Predicted Lighthouse Scores

| Metric | Before | After (Plan Only) | After (With Recommendations) |
|--------|--------|-------------------|------------------------------|
| LCP | ~2.5-3.5s | ~1.5-2.5s | ~0.8-1.2s |
| FID/INP | ~80-120ms | ~80-120ms | ~30-50ms |
| CLS | ~0.05-0.1 | ~0.05-0.1 | <0.05 |
| TTI | ~3.0-4.0s | ~2.0-3.0s | ~1.5-2.0s |
| Performance Score | 65-75 | 80-85 | 90-95 |

---

### P0: Critical Performance Fixes

#### 1. Parallelize Twitch API Calls (Saves 150-200ms per request)

**Current State** - Sequential API calls in `/api/channels/index.ts`:
```typescript
const streamsResult = await getFollowedStreams(userId);
const followedResult = await getFollowedChannels(userId);
```

**Fix** - Run in parallel:
```typescript
const [streamsResult, followedResult] = await Promise.all([
  getFollowedStreams(userId),
  getFollowedChannels(userId),
]);
```

#### 2. Batch VOD Fetching on Startup (Reduces cold start from 4s to 800ms)

**Problem**: 20 favorites = 20 sequential Twitch API calls (~200ms each = 4 seconds)

**Fix** in `vod-cache-service.ts`:
```typescript
async function populateInitialCache() {
  const favorites = getAllFavorites();
  if (favorites instanceof Error) return;

  const BATCH_SIZE = 5;
  for (let batchIndex = 0; batchIndex < favorites.length; batchIndex += BATCH_SIZE) {
    const batch = favorites.slice(batchIndex, batchIndex + BATCH_SIZE);
    await Promise.all(batch.map((favorite) => refreshVodsForChannel(favorite.id)));
  }
}
```

#### 3. Memoize ChannelCard (Reduces re-renders by ~95%)

**Problem**: 30-second polling triggers full grid re-render even if only 1-2 channels changed

**Fix** in `channel-card.tsx`:
```typescript
import { memo } from "react";

function areChannelCardPropsEqual(
  previousProps: ChannelCardProps,
  nextProps: ChannelCardProps
) {
  const previousChannel = previousProps.channel;
  const nextChannel = nextProps.channel;

  return (
    previousChannel.id === nextChannel.id &&
    previousChannel.isLive === nextChannel.isLive &&
    previousChannel.isFavorite === nextChannel.isFavorite &&
    previousChannel.stream?.viewerCount === nextChannel.stream?.viewerCount &&
    previousChannel.latestVod?.id === nextChannel.latestVod?.id &&
    previousProps.variant === nextProps.variant
  );
}

function ChannelCardComponent({
  channel,
  onToggleFavorite,
  variant = "full"
}: ChannelCardProps) {
  // ... existing implementation
}

const ChannelCard = memo(ChannelCardComponent, areChannelCardPropsEqual);

export { ChannelCard };
```

#### 4. Memoize Channel Categorization

**Fix** in `channel-grid.tsx`:
```typescript
import { useMemo } from "react";

const { liveFavorites, offlineFavorites, nonFavoriteChannels } = useMemo(() => {
  const live: Array<Channel> = [];
  const offline: Array<Channel> = [];
  const nonFavorite: Array<Channel> = [];

  for (const channel of channels) {
    if (channel.isFavorite) {
      if (channel.isLive) {
        live.push(channel);
      } else {
        offline.push(channel);
      }
    } else {
      nonFavorite.push(channel);
    }
  }

  return { liveFavorites: live, offlineFavorites: offline, nonFavoriteChannels: nonFavorite };
}, [channels]);
```

---

### P1: TanStack Query Configuration

#### 5. Optimal Query Configuration for 30-Second Polling

**Update** `use-channels.ts`:
```typescript
const { data, isLoading, isFetching, error, refetch } = useQuery({
  queryKey: CHANNELS_QUERY_KEY,
  queryFn: fetchChannels,
  staleTime: 25_000,                  // Slightly less than interval to prevent gaps
  refetchInterval: 30_000,
  refetchOnMount: false,              // Prevent duplicate fetches on route changes
  refetchIntervalInBackground: false, // Save battery when tab inactive
  gcTime: 5 * 60 * 1000,              // 5 minutes - prevents cache bloat
});
```

**Key additions explained:**
- `staleTime: 25_000`: Prevents edge case where data becomes stale milliseconds before refetch
- `refetchOnMount: false`: Sidebar imports useChannels too; prevents unnecessary refetches
- `refetchIntervalInBackground: false`: Stops polling when browser tab is not active
- `gcTime`: Prevents stale query cache accumulation

#### 6. Add Optimistic Updates to useToggleFavorite

**Current**: Only invalidates on success, causing visual delay

**Fix** in `use-channels.ts`:
```typescript
function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleFavorite,
    onMutate: async (channelId: string) => {
      await queryClient.cancelQueries({ queryKey: CHANNELS_QUERY_KEY });

      const previousChannels = queryClient.getQueryData<Array<Channel>>(CHANNELS_QUERY_KEY);

      if (previousChannels) {
        queryClient.setQueryData(CHANNELS_QUERY_KEY,
          previousChannels.map(channel =>
            channel.id === channelId
              ? { ...channel, isFavorite: !channel.isFavorite }
              : channel
          )
        );
      }

      return { previousChannels };
    },
    onError: (_error, _channelId, mutationContext) => {
      if (mutationContext?.previousChannels) {
        queryClient.setQueryData(CHANNELS_QUERY_KEY, mutationContext.previousChannels);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CHANNELS_QUERY_KEY });
    },
  });
}
```

---

### P2: Sidebar Optimizations

#### 7. Memoize Sidebar Components

**In `Sidebar.tsx`**:
```typescript
// Memoize categorization
const { live, offline } = useMemo(
  () => categorizeChannels(channels),
  [channels]
);

// Comparison function for ChannelItem
function areChannelItemPropsEqual(
  previousProps: ChannelItemProps,
  nextProps: ChannelItemProps
) {
  return (
    previousProps.channel.id === nextProps.channel.id &&
    previousProps.channel.isLive === nextProps.channel.isLive &&
    previousProps.channel.isFavorite === nextProps.channel.isFavorite &&
    previousProps.channel.viewerCount === nextProps.channel.viewerCount &&
    previousProps.isExpanded === nextProps.isExpanded
  );
}

// Wrap ChannelItem in React.memo
function ChannelItemComponent({
  channel,
  isExpanded,
  onFavoriteToggle
}: ChannelItemProps) {
  // ... existing implementation
}

const ChannelItem = memo(ChannelItemComponent, areChannelItemPropsEqual);

// Wrap ChannelAvatar in React.memo
function ChannelAvatarComponent({
  channel,
  isExpanded
}: ChannelAvatarProps) {
  // ... existing implementation
}

const ChannelAvatar = memo(ChannelAvatarComponent);
```

#### 8. Update Sidebar Query Configuration

**In `use-followed-channels.ts`**:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: FOLLOWED_CHANNELS_QUERY_KEY,
  queryFn: fetchFollowedChannels,
  staleTime: 60_000,
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
  gcTime: 10 * 60 * 1000,
});
```

---

### P3: CLS Prevention

#### 9. Add Explicit Image Dimensions

**In `channel-card.tsx`** (when rendering in a list with index):
```typescript
{channels.map((channel, channelIndex) => (
  <img
    src={thumbnailUrl}
    alt={channel.displayName}
    width={440}
    height={248}
    className="w-full h-full object-cover"
    loading={channelIndex < 4 ? "eager" : "lazy"}
  />
))}
```

---

### P4: Background Refresh Optimization

#### 10. Stagger Background Refresh (Prevents Thundering Herd)

**Problem**: All 20 channels refresh simultaneously every 30 minutes

**Fix** - Distribute load evenly:
```typescript
async function startStaggeredRefresh() {
  const favorites = getAllFavorites();
  if (favorites instanceof Error) return;

  const intervalPerChannel = VOD_CACHE_TTL_MS / favorites.length;

  for (let channelIndex = 0; channelIndex < favorites.length; channelIndex++) {
    const favorite = favorites[channelIndex];
    if (favorite === undefined) continue;

    setTimeout(() => {
      refreshVodsForChannel(favorite.id).catch((error) => {
        console.error("[vod-cache] Failed to refresh VODs for channel:", favorite.id, error);
      });
      setInterval(() => {
        refreshVodsForChannel(favorite.id).catch((error) => {
          console.error("[vod-cache] Failed to refresh VODs for channel:", favorite.id, error);
        });
      }, VOD_CACHE_TTL_MS);
    }, channelIndex * intervalPerChannel);
  }
}
```

#### 11. Memory-Safe Batch Processing

**In `refreshAllFavoriteVods()`**:
```typescript
async function refreshAllFavoriteVods() {
  const favorites = getAllFavorites();
  if (favorites instanceof Error) return;

  const BATCH_SIZE = 10;
  for (let batchIndex = 0; batchIndex < favorites.length; batchIndex += BATCH_SIZE) {
    const batch = favorites.slice(batchIndex, batchIndex + BATCH_SIZE);
    await Promise.all(batch.map((favorite) => refreshVodsForChannel(favorite.id)));
    // Allow GC between batches
  }
}
```

---

### P5: Optional Future Optimizations

#### 12. Consider User Profile Image Cache

Add a `user_cache` table to eliminate `getUsers()` waterfall for non-favorites:
```typescript
userCache = sqliteTable("user_cache", {
  userId: text("user_id").primaryKey(),
  login: text("login").notNull(),
  displayName: text("display_name").notNull(),
  profileImageUrl: text("profile_image_url").notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
```

#### 13. Consider Virtualization for Large Channel Lists

If users typically have 50+ followed channels, consider `@tanstack/react-virtual` for the sidebar.

#### 14. Delete Deprecated Files After Migration

After Phase 6 is complete, delete `src/features/sidebar/channel-last-seen.repository.ts` to reduce bundle size.

---

## Implementation Priority Matrix

| Priority | Change | Files | Impact |
|----------|--------|-------|--------|
| P0 | Parallelize Twitch API calls | `api/channels/index.ts` | -150-200ms per request |
| P0 | Batch startup VOD fetch | `vod-cache-service.ts` | Cold start 4s → 800ms |
| P0 | React.memo ChannelCard | `channel-card.tsx` | -95% re-renders |
| P0 | useMemo categorization | `channel-grid.tsx` | -40% JS execution |
| P1 | Query config (staleTime, gcTime) | `use-channels.ts` | Prevents cache issues |
| P1 | Optimistic favorite toggle | `use-channels.ts` | Instant UI feedback |
| P2 | Sidebar memoization | `Sidebar.tsx` | Prevents cascade |
| P3 | Image dimensions | `channel-card.tsx` | CLS < 0.05 |
| P4 | Stagger background refresh | `vod-cache-service.ts` | Even load distribution |
| P5 | User profile cache | New table | Eliminate API waterfall |

---

## Code Review Findings

Three specialized reviewers (Drizzle ORM, TypeScript, React) analyzed the plan. Below are the required fixes.

### Drizzle ORM Issues (CRITICAL)

**1. Missing FK Constraint on `latestVodId`**
The schema lacks a proper foreign key constraint. Fix:
```typescript
channelCache = sqliteTable("channel_cache", {
    channelId: text("channel_id").primaryKey(),
    isLive: integer("is_live", { mode: "boolean" }).notNull().default(false),
    lastLiveAt: text("last_live_at"),
    latestVodId: integer("latest_vod_id").references(() => cachedVods.id, { onDelete: "set null" }),
    updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
    index("channel_cache_latest_vod_id_idx").on(table.latestVodId),
]);
```

**2. `fetchedAt`/`updatedAt` Don't Auto-Update on UPDATE**
SQLite's `DEFAULT CURRENT_TIMESTAMP` only applies on INSERT. All UPDATE operations must manually set:
```typescript
.set({
    ...updates,
    fetchedAt: sql`CURRENT_TIMESTAMP`
})
```

**3. Use Transactions for Multi-Statement Operations**
`refreshVodsForChannel()` must use a transaction to ensure atomicity (insert VOD → update FK).

**4. Export Drizzle Types from Schema**
```typescript
export type ChannelCacheSelect = typeof channelCache.$inferSelect;
export type CachedVodSelect = typeof cachedVods.$inferSelect;
```

---

### TypeScript Issues (CRITICAL)

**1. Inconsistent Error Handling - Silent Returns**
Functions like `populateInitialCache` use `return;` on error instead of propagating:
```typescript
// BAD
if (favorites instanceof Error) return;

// GOOD
if (favorites instanceof Error) {
  return favorites;
}
return null;  // Explicit success
```

**2. Using `.catch()` on Result Pattern Functions**
The `startStaggeredRefresh` example uses `.catch()` but Result pattern functions return errors, not throw. Fix:
```typescript
// BAD
refreshVodsForChannel(favorite.id).catch((error) => { ... });

// GOOD
const result = await refreshVodsForChannel(favorite.id);
if (result instanceof Error) {
  console.error("[vod-cache] Failed:", result.message);
}
```

**3. Missing Type Definitions**
Add these types to the plan:
```typescript
interface VodInput {
  vodId: string;
  channelId: string;
  title: string;
  duration: string;
  createdAt: string;
  thumbnailUrl: string;
}

interface ChannelCacheInput {
  channelId: string;
  isLive: boolean;
  lastLiveAt?: string;
  latestVodId?: number;
}

interface CacheOptions {
  maxAgeMs?: number;
  forceRefresh?: boolean;
}
```

---

### React Issues (CRITICAL)

**1. Memo Comparison Functions Ignore Callbacks**
Both `areChannelCardPropsEqual` and `areChannelItemPropsEqual` ignore their callback props (`onToggleFavorite`, `onFavoriteToggle`), which can cause stale closures.

**Fix:** Either:
- Include callbacks in comparison AND use `useCallback` in parent
- Or have children call mutation hooks directly instead of receiving callbacks

**2. Optimistic Updates Only Handle One Query Key**
The optimistic update for `useToggleFavorite` only updates `CHANNELS_QUERY_KEY` but sidebar uses `FOLLOWED_CHANNELS_QUERY_KEY`. Both need updating for consistent UI.

**3. Misleading Explanation**
The plan says `useMemo` "reduces re-renders by ~95%". Correction: `useMemo` reduces *computation* during renders, not the number of re-renders.

**4. `refetchOnMount: false` Needs Verification**
Verify `useChannels` is only used by the main grid before disabling. If used elsewhere, this could cause stale data after route changes.

---

### Summary of Required Changes Before Implementation

| Priority | Issue | Fix |
|----------|-------|-----|
| CRITICAL | Missing FK constraint | Add `.references()` with `onDelete: "set null"` |
| CRITICAL | Missing FK index | Add index on `latestVodId` |
| CRITICAL | Silent error returns | Return the error or `null` for success |
| CRITICAL | `.catch()` on Result pattern | Use `instanceof Error` check instead |
| CRITICAL | Memo ignores callbacks | Include callbacks OR use `useCallback` in parent |
| HIGH | No transactions | Wrap multi-statement ops in `database.transaction()` |
| HIGH | Optimistic update incomplete | Also update `FOLLOWED_CHANNELS_QUERY_KEY` |
| MEDIUM | Missing type definitions | Add `VodInput`, `ChannelCacheInput`, `CacheOptions` |
| MEDIUM | Manual timestamp on UPDATE | Set `fetchedAt` explicitly in all updates |
| LOW | Export Drizzle types | Add `$inferSelect` exports |
