# VOD Caching System Implementation Plan

## Problem Statement

The main grid API (`/api/channels/`) fetches VODs fresh from Twitch for every offline favorite on every request. VODs are stable data that only change when a stream ends. This creates unnecessary API calls and slower load times.

## Solution Overview

Implement a **cache-first VOD system** with:

1. **`cached_vods` table** - Store full VOD metadata (multiple per channel)
2. **`channel_cache` table** - Track live state + foreign key reference to latest VOD
3. **TTL-based caching** - 30-minute background refresh keeps cache warm
4. **Immediate refresh on offline transition** - When a channel goes offline, fetch new VOD immediately

**Critical Requirements:**

- Live stream data is NEVER cached - `getFollowedStreams()` hits Twitch API every request
- Main page refreshes every 30 seconds for real-time live status
- VOD cache pre-populated on server start (non-blocking)
- Background 30-minute refresh keeps VODs fresh automatically

---

## Coding Standards

All code in this plan follows the project standards:

- **No explicit return types** - TypeScript infers them
- **Result pattern** - Functions return `T | Error`, never throw (except `useQuery`/`useMutation` fetch functions)
- **`Array<T>` syntax** - Not `T[]`
- **No abbreviations** - Use `previous` not `prev`, `index` not `idx`, `channel` not `ch`
- **Function declarations** - Use `function` keyword, not arrow function variables
- **Manual timestamps on UPDATE** - SQLite `DEFAULT CURRENT_TIMESTAMP` only applies on INSERT
- **Import order** - External packages, then internal (`@/`), then relative (`./`), then types

---

## Phase 1: Database Schema

### File: `src/db/schema.ts`

Add these tables after existing definitions:

```typescript
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Define cachedVods FIRST since channelCache references it
export const cachedVods = sqliteTable(
    "cached_vods",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        // videoId has implicit unique index from .unique() constraint - used for conflict resolution
        videoId: text("video_id").notNull().unique(),
        channelId: text("channel_id").notNull(),
        title: text("title").notNull(),
        duration: text("duration").notNull(),
        createdAt: text("created_at").notNull(),
        thumbnailUrl: text("thumbnail_url").notNull(),
        fetchedAt: text("fetched_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    },
    (table) => [
        // Single composite index covers both channelId-only and channelId+createdAt queries
        index("cached_vods_channel_created_idx").on(table.channelId, table.createdAt),
    ]
);

export const channelCache = sqliteTable(
    "channel_cache",
    {
        channelId: text("channel_id").primaryKey(),
        isLive: integer("is_live", { mode: "boolean" }).notNull().default(false),
        lastLiveAt: text("last_live_at"),
        latestVideoId: integer("latest_video_id").references(() => cachedVods.id, {
            onDelete: "set null",
        }),
        updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    },
    (table) => [
        index("channel_cache_latest_video_id_idx").on(table.latestVideoId),
        index("channel_cache_is_live_idx").on(table.isLive),
    ]
);

// Export inferred types
export type CachedVideoSelect = typeof cachedVods.$inferSelect;
export type CachedVideoInsert = typeof cachedVods.$inferInsert;
export type ChannelCacheSelect = typeof channelCache.$inferSelect;
export type ChannelCacheInsert = typeof channelCache.$inferInsert;
```

### Migration

```bash
bun run drizzle-kit generate
bun run drizzle-kit migrate
```

---

## Phase 2: Type Definitions

### File: `src/features/vods/vods.types.ts`

```typescript
// Import types from schema - do not re-declare
import type { CachedVideoSelect, ChannelCacheSelect } from "@/src/db/schema";

interface VideoInput {
    videoId: string;
    channelId: string;
    title: string;
    duration: string;
    createdAt: string;
    thumbnailUrl: string;
}

interface ChannelCacheInput {
    channelId: string;
    isLive: boolean;
    lastLiveAt: string | null;
    latestVideoId: number | null;
}

interface ChannelCacheWithVideo {
    channelId: string;
    isLive: boolean;
    lastLiveAt: string | null;
    latestVideoId: number | null;
    updatedAt: string;
    latestVideo: CachedVideoSelect | null;
}

export type {
    CachedVideoSelect,
    ChannelCacheInput,
    ChannelCacheSelect,
    ChannelCacheWithVideo,
    VideoInput,
};
```

---

## Phase 3: VOD Repository

### File: `src/features/vods/vods.repository.ts`

```typescript
import { and, desc, eq, notInArray, sql } from "drizzle-orm";

import { database } from "@/src/db";
import { cachedVods, channelCache } from "@/src/db/schema";

import type { VideoInput } from "./vods.types";

function getVideosForChannel(channelId: string, limit: number) {
    try {
        const rows = database
            .select()
            .from(cachedVods)
            .where(eq(cachedVods.channelId, channelId))
            .orderBy(desc(cachedVods.createdAt))
            .limit(limit)
            .all();

        return rows;
    } catch (error) {
        console.error("[vods.repository] getVideosForChannel failed:", error);
        return new Error("Failed to get videos for channel");
    }
}

function upsertVideo(videoData: VideoInput) {
    try {
        const result = database
            .insert(cachedVods)
            .values({
                videoId: videoData.videoId,
                channelId: videoData.channelId,
                title: videoData.title,
                duration: videoData.duration,
                createdAt: videoData.createdAt,
                thumbnailUrl: videoData.thumbnailUrl,
            })
            .onConflictDoUpdate({
                target: cachedVods.videoId,
                set: {
                    title: videoData.title,
                    duration: videoData.duration,
                    createdAt: videoData.createdAt,
                    thumbnailUrl: videoData.thumbnailUrl,
                    fetchedAt: sql`CURRENT_TIMESTAMP`,
                },
            })
            .returning({ id: cachedVods.id })
            .get();

        if (result === undefined) {
            return new Error("Upsert did not return a row");
        }

        return result.id;
    } catch (error) {
        console.error("[vods.repository] upsertVideo failed:", error);
        return new Error("Failed to upsert video");
    }
}

function deleteOldVideos(channelId: string, keepCount: number) {
    try {
        // Wrap in transaction to prevent race conditions between read and delete
        const deletedCount = database.transaction((transaction) => {
            // Get the latestVideoId from channelCache to protect it from deletion
            const cacheRow = transaction
                .select({ latestVideoId: channelCache.latestVideoId })
                .from(channelCache)
                .where(eq(channelCache.channelId, channelId))
                .get();

            const protectedVideoId = cacheRow?.latestVideoId;

            const videosToKeep = transaction
                .select({ id: cachedVods.id })
                .from(cachedVods)
                .where(eq(cachedVods.channelId, channelId))
                .orderBy(desc(cachedVods.createdAt))
                .limit(keepCount)
                .all();

            const idsToKeep = videosToKeep.map((video) => video.id);

            // Also protect the latestVideoId if it exists and is not already in the keep list
            if (protectedVideoId !== null && protectedVideoId !== undefined) {
                if (!idsToKeep.includes(protectedVideoId)) {
                    idsToKeep.push(protectedVideoId);
                }
            }

            if (idsToKeep.length === 0) {
                const deleted = transaction
                    .delete(cachedVods)
                    .where(eq(cachedVods.channelId, channelId))
                    .returning({ id: cachedVods.id })
                    .all();

                return deleted.length;
            }

            const deleted = transaction
                .delete(cachedVods)
                .where(
                    and(
                        eq(cachedVods.channelId, channelId),
                        notInArray(cachedVods.id, idsToKeep)
                    )
                )
                .returning({ id: cachedVods.id })
                .all();

            return deleted.length;
        });

        return deletedCount;
    } catch (error) {
        console.error("[vods.repository] deleteOldVideos failed:", error);
        return new Error("Failed to delete old videos");
    }
}

export { deleteOldVideos, getVideosForChannel, upsertVideo };
```

---

## Phase 4: Channel Cache Repository

### File: `src/features/vods/channel-cache.repository.ts`

```typescript
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";

import { database } from "@/src/db";
import { cachedVods, channelCache } from "@/src/db/schema";

import type { SQL } from "drizzle-orm";
import type { CachedVideoSelect } from "@/src/db/schema";
import type { ChannelCacheInput, ChannelCacheWithVideo } from "./vods.types";

function getChannelCache(channelId: string) {
    try {
        const row = database
            .select({
                channelId: channelCache.channelId,
                isLive: channelCache.isLive,
                lastLiveAt: channelCache.lastLiveAt,
                latestVideoId: channelCache.latestVideoId,
                updatedAt: channelCache.updatedAt,
                latestVideo: {
                    id: cachedVods.id,
                    videoId: cachedVods.videoId,
                    channelId: cachedVods.channelId,
                    title: cachedVods.title,
                    duration: cachedVods.duration,
                    createdAt: cachedVods.createdAt,
                    thumbnailUrl: cachedVods.thumbnailUrl,
                    fetchedAt: cachedVods.fetchedAt,
                },
            })
            .from(channelCache)
            .leftJoin(cachedVods, eq(channelCache.latestVideoId, cachedVods.id))
            .where(eq(channelCache.channelId, channelId))
            .get();

        if (row === undefined) {
            return null;
        }

        // When id is not null, all other fields are guaranteed non-null due to LEFT JOIN semantics
        // Type assertion needed because TypeScript cannot verify this SQL semantic
        const result: ChannelCacheWithVideo = {
            channelId: row.channelId,
            isLive: row.isLive,
            lastLiveAt: row.lastLiveAt,
            latestVideoId: row.latestVideoId,
            updatedAt: row.updatedAt,
            latestVideo: row.latestVideo.id !== null
                ? (row.latestVideo as CachedVideoSelect)
                : null,
        };

        return result;
    } catch (error) {
        console.error("[channel-cache.repository] getChannelCache failed:", error);
        return new Error("Failed to get channel cache");
    }
}

function getChannelCacheBulk(channelIds: Array<string>) {
    try {
        if (channelIds.length === 0) {
            return [];
        }

        const rows = database
            .select({
                channelId: channelCache.channelId,
                isLive: channelCache.isLive,
                lastLiveAt: channelCache.lastLiveAt,
                latestVideoId: channelCache.latestVideoId,
                updatedAt: channelCache.updatedAt,
                latestVideo: {
                    id: cachedVods.id,
                    videoId: cachedVods.videoId,
                    channelId: cachedVods.channelId,
                    title: cachedVods.title,
                    duration: cachedVods.duration,
                    createdAt: cachedVods.createdAt,
                    thumbnailUrl: cachedVods.thumbnailUrl,
                    fetchedAt: cachedVods.fetchedAt,
                },
            })
            .from(channelCache)
            .leftJoin(cachedVods, eq(channelCache.latestVideoId, cachedVods.id))
            .where(inArray(channelCache.channelId, channelIds))
            .all();

        // When id is not null, all other fields are guaranteed non-null due to LEFT JOIN semantics
        // Type assertion needed because TypeScript cannot verify this SQL semantic
        const results: Array<ChannelCacheWithVideo> = rows.map((row) => ({
            channelId: row.channelId,
            isLive: row.isLive,
            lastLiveAt: row.lastLiveAt,
            latestVideoId: row.latestVideoId,
            updatedAt: row.updatedAt,
            latestVideo: row.latestVideo.id !== null
                ? (row.latestVideo as CachedVideoSelect)
                : null,
        }));

        return results;
    } catch (error) {
        console.error("[channel-cache.repository] getChannelCacheBulk failed:", error);
        return new Error("Failed to get channel caches in bulk");
    }
}

function getAllChannelCaches() {
    try {
        const rows = database
            .select({
                channelId: channelCache.channelId,
                isLive: channelCache.isLive,
                lastLiveAt: channelCache.lastLiveAt,
                latestVideoId: channelCache.latestVideoId,
                updatedAt: channelCache.updatedAt,
            })
            .from(channelCache)
            .all();

        return rows;
    } catch (error) {
        console.error("[channel-cache.repository] getAllChannelCaches failed:", error);
        return new Error("Failed to get all channel caches");
    }
}

function upsertChannelCache(cacheData: ChannelCacheInput) {
    try {
        const result = database
            .insert(channelCache)
            .values({
                channelId: cacheData.channelId,
                isLive: cacheData.isLive,
                lastLiveAt: cacheData.lastLiveAt,
                latestVideoId: cacheData.latestVideoId,
            })
            .onConflictDoUpdate({
                target: channelCache.channelId,
                set: {
                    isLive: cacheData.isLive,
                    lastLiveAt: cacheData.lastLiveAt,
                    latestVideoId: cacheData.latestVideoId,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            })
            .returning({ channelId: channelCache.channelId })
            .get();

        if (result === undefined) {
            return new Error("Upsert did not return a row");
        }

        return null;
    } catch (error) {
        console.error("[channel-cache.repository] upsertChannelCache failed:", error);
        return new Error("Failed to upsert channel cache");
    }
}

function updateChannelLiveState(channelId: string, isLive: boolean, lastLiveAt?: string) {
    try {
        const setValues: {
            isLive: boolean;
            updatedAt: SQL<unknown>;
            lastLiveAt?: string;
        } = {
            isLive: isLive,
            updatedAt: sql`CURRENT_TIMESTAMP`,
        };

        if (lastLiveAt !== undefined) {
            setValues.lastLiveAt = lastLiveAt;
        }

        const result = database
            .insert(channelCache)
            .values({
                channelId: channelId,
                isLive: isLive,
                lastLiveAt: lastLiveAt ?? null,
            })
            .onConflictDoUpdate({
                target: channelCache.channelId,
                set: setValues,
            })
            .returning({ channelId: channelCache.channelId })
            .get();

        if (result === undefined) {
            return new Error("Upsert did not return a row");
        }

        return null;
    } catch (error) {
        console.error("[channel-cache.repository] updateChannelLiveState failed:", error);
        return new Error("Failed to update channel live state");
    }
}

function updateLatestVideoId(channelId: string, latestVideoId: number) {
    try {
        // Only update existing records - do not create new ones with potentially wrong isLive state
        // If channel cache doesn't exist, caller should use upsertChannelCache instead
        const result = database
            .update(channelCache)
            .set({
                latestVideoId: latestVideoId,
                updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(channelCache.channelId, channelId))
            .returning({ channelId: channelCache.channelId })
            .get();

        if (result === undefined) {
            // Channel cache doesn't exist - not an error, caller should handle this
            return null;
        }

        return null;
    } catch (error) {
        console.error("[channel-cache.repository] updateLatestVideoId failed:", error);
        return new Error("Failed to update latest video ID");
    }
}

function processLiveStateChangesAtomic(currentlyLiveChannelIds: Array<string>) {
    try {
        // Wrap in transaction to ensure both updates happen atomically
        return database.transaction((transaction) => {
            // Build the condition for channels not in the live list
            let notInLiveChannelsCondition: SQL<unknown> = sql`1=1`;
            if (currentlyLiveChannelIds.length > 0) {
                notInLiveChannelsCondition = notInArray(channelCache.channelId, currentlyLiveChannelIds);
            }

            // Atomic update: set isLive = false for channels that were live but are now offline
            const wentOffline = transaction
                .update(channelCache)
                .set({
                    isLive: false,
                    lastLiveAt: sql`CURRENT_TIMESTAMP`,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                })
                .where(
                    and(
                        eq(channelCache.isLive, true),
                        notInLiveChannelsCondition
                    )
                )
                .returning({ channelId: channelCache.channelId })
                .all();

            // Also mark channels that are now live
            if (currentlyLiveChannelIds.length > 0) {
                transaction
                    .update(channelCache)
                    .set({
                        isLive: true,
                        updatedAt: sql`CURRENT_TIMESTAMP`,
                    })
                    .where(inArray(channelCache.channelId, currentlyLiveChannelIds))
                    .run();
            }

            return wentOffline.map((row) => row.channelId);
        });
    } catch (error) {
        console.error("[channel-cache.repository] processLiveStateChangesAtomic failed:", error);
        return new Error("Failed to process live state changes");
    }
}

export {
    getAllChannelCaches,
    getChannelCache,
    getChannelCacheBulk,
    processLiveStateChangesAtomic,
    updateChannelLiveState,
    updateLatestVideoId,
    upsertChannelCache,
};
```

---

## Phase 5: Cache Service

### File: `src/services/video-cache-service.ts`

```typescript
import { and, desc, eq, notInArray, sql } from "drizzle-orm";

import { database } from "@/src/db";
import { cachedVods, channelCache } from "@/src/db/schema";
import { getAllFavorites } from "@/src/features/channels/favorites.repository";
import {
    getChannelCacheBulk,
    processLiveStateChangesAtomic,
} from "@/src/features/vods/channel-cache.repository";
import { getVideos } from "@/src/services/twitch-service";

import type { TwitchStream } from "@/src/services/twitch-service";

const VIDEO_CACHE_TTL_MS = 30 * 60 * 1000;
const VIDEOS_PER_CHANNEL_LIMIT = 5;
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 500;
const BASE_BACKOFF_MS = 60 * 1000; // 1 minute
const MAX_BACKOFF_MS = 60 * 60 * 1000; // 1 hour

// Track background refresh state
let refreshIntervalId: ReturnType<typeof setInterval> | null = null;
const channelBackoffState = new Map<string, { failureCount: number; nextAttemptAt: number }>();

// Cleanup interval for stale backoff entries
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

function calculateBackoffWithJitter(failureCount: number) {
    const baseBackoff = BASE_BACKOFF_MS * Math.pow(2, failureCount - 1);
    const cappedBackoff = Math.min(baseBackoff, MAX_BACKOFF_MS);
    const jitter = Math.random() * 0.3 * cappedBackoff; // 0-30% jitter
    return Math.floor(cappedBackoff + jitter);
}

function getRefreshIntervalMs(favoriteCount: number) {
    if (favoriteCount === 0) {
        return VIDEO_CACHE_TTL_MS;
    }

    // Ensure all channels refresh within 80% of TTL (20% safety margin)
    const targetRefreshWindow = VIDEO_CACHE_TTL_MS * 0.8;
    const intervalMs = Math.floor(targetRefreshWindow / favoriteCount);

    // Clamp between reasonable bounds
    const MIN_INTERVAL_MS = 5000;
    const MAX_INTERVAL_MS = 5 * 60 * 1000;

    return Math.max(MIN_INTERVAL_MS, Math.min(intervalMs, MAX_INTERVAL_MS));
}

async function refreshVideosForChannel(channelId: string) {
    // Fetch from Twitch API OUTSIDE the transaction to avoid holding DB lock during network call
    const videosResult = await getVideos(channelId, VIDEOS_PER_CHANNEL_LIMIT);

    if (videosResult instanceof Error) {
        console.error("[video-cache] Failed to fetch videos from Twitch:", videosResult.message);
        return videosResult;
    }

    if (videosResult.length === 0) {
        return null;
    }

    const latestVideo = videosResult[0];
    if (latestVideo === undefined) {
        return null;
    }

    // Perform synchronous database transaction (no async operations inside)
    try {
        const videoRowId = database.transaction((transaction) => {
            // Upsert the latest video
            const videoResult = transaction
                .insert(cachedVods)
                .values({
                    videoId: latestVideo.id,
                    channelId: channelId,
                    title: latestVideo.title,
                    duration: latestVideo.duration,
                    createdAt: latestVideo.created_at,
                    thumbnailUrl: latestVideo.thumbnail_url,
                })
                .onConflictDoUpdate({
                    target: cachedVods.videoId,
                    set: {
                        title: latestVideo.title,
                        duration: latestVideo.duration,
                        createdAt: latestVideo.created_at,
                        thumbnailUrl: latestVideo.thumbnail_url,
                        fetchedAt: sql`CURRENT_TIMESTAMP`,
                    },
                })
                .returning({ id: cachedVods.id })
                .get();

            if (videoResult === undefined) {
                throw new Error("Video upsert did not return a row");
            }

            // Upsert channel cache with foreign key - verify with returning()
            const cacheResult = transaction
                .insert(channelCache)
                .values({
                    channelId: channelId,
                    isLive: false,
                    latestVideoId: videoResult.id,
                })
                .onConflictDoUpdate({
                    target: channelCache.channelId,
                    set: {
                        latestVideoId: videoResult.id,
                        updatedAt: sql`CURRENT_TIMESTAMP`,
                    },
                })
                .returning({ channelId: channelCache.channelId })
                .get();

            if (cacheResult === undefined) {
                throw new Error("Channel cache upsert did not return a row");
            }

            // Clean up old videos (keep only VIDEOS_PER_CHANNEL_LIMIT)
            // Use notInArray instead of sql.raw for type safety
            const videosToKeep = transaction
                .select({ id: cachedVods.id })
                .from(cachedVods)
                .where(eq(cachedVods.channelId, channelId))
                .orderBy(desc(cachedVods.createdAt))
                .limit(VIDEOS_PER_CHANNEL_LIMIT)
                .all();

            const idsToKeep = videosToKeep.map((video) => video.id);

            if (idsToKeep.length > 0) {
                transaction
                    .delete(cachedVods)
                    .where(
                        and(
                            eq(cachedVods.channelId, channelId),
                            notInArray(cachedVods.id, idsToKeep)
                        )
                    )
                    .run();
            }

            return videoResult.id;
        });

        return videoRowId;
    } catch (error) {
        console.error("[video-cache] Database transaction failed:", error);
        return error instanceof Error ? error : new Error("Database transaction failed");
    }
}

async function refreshVideosForChannelSafe(channelId: string) {
    const state = channelBackoffState.get(channelId) ?? { failureCount: 0, nextAttemptAt: 0 };

    const now = Date.now();
    if (now < state.nextAttemptAt) {
        return null;
    }

    const result = await refreshVideosForChannel(channelId);

    if (result instanceof Error) {
        state.failureCount++;
        const backoffMs = calculateBackoffWithJitter(state.failureCount);
        state.nextAttemptAt = now + backoffMs;
        channelBackoffState.set(channelId, state);

        if (state.failureCount >= 3) {
            console.warn(`[video-cache] Channel ${channelId} failed ${state.failureCount} times, backoff: ${Math.round(backoffMs / 1000)}s`);
        }

        return result;
    }

    // Success - clear backoff state
    channelBackoffState.delete(channelId);
    return result;
}

async function populateInitialCache() {
    console.log("[video-cache] Starting initial cache population...");

    const favorites = getAllFavorites();

    if (favorites instanceof Error) {
        console.error("[video-cache] Failed to get favorites:", favorites.message);
        return favorites;
    }

    if (favorites.length === 0) {
        console.log("[video-cache] No favorites to cache");
        return null;
    }

    let successCount = 0;
    let errorCount = 0;

    for (let batchStartIndex = 0; batchStartIndex < favorites.length; batchStartIndex += BATCH_SIZE) {
        const batch = favorites.slice(batchStartIndex, batchStartIndex + BATCH_SIZE);

        const results = await Promise.allSettled(
            batch.map((favorite) => refreshVideosForChannel(favorite.id))
        );

        for (const result of results) {
            if (result.status === "rejected" || result.value instanceof Error) {
                errorCount++;
            } else {
                successCount++;
            }
        }

        if (batchStartIndex + BATCH_SIZE < favorites.length) {
            await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
    }

    console.log(`[video-cache] Initial cache population complete: ${successCount} succeeded, ${errorCount} failed`);

    return null;
}

function startBackgroundRefresh() {
    if (refreshIntervalId !== null) {
        clearInterval(refreshIntervalId);
    }

    let refreshIndex = 0;
    let currentIntervalMs = VIDEO_CACHE_TTL_MS / 20; // Initial fallback

    function scheduleNextRefresh() {
        const favorites = getAllFavorites();

        if (favorites instanceof Error) {
            console.error("[video-cache] Background refresh failed to get favorites:", favorites.message);
            refreshIntervalId = setTimeout(scheduleNextRefresh, currentIntervalMs);
            return;
        }

        if (favorites.length === 0) {
            refreshIntervalId = setTimeout(scheduleNextRefresh, currentIntervalMs);
            return;
        }

        // Recalculate interval based on current favorites count
        currentIntervalMs = getRefreshIntervalMs(favorites.length);

        const currentIndex = refreshIndex % favorites.length;
        const favorite = favorites[currentIndex];

        if (favorite !== undefined) {
            refreshVideosForChannelSafe(favorite.id)
                .then((result) => {
                    if (result instanceof Error) {
                        console.error("[video-cache] Background refresh failed for:", favorite.id, result.message);
                    }
                })
                .catch((error) => {
                    console.error("[video-cache] Unexpected error in background refresh:", error);
                });
        }

        refreshIndex++;
        refreshIntervalId = setTimeout(scheduleNextRefresh, currentIntervalMs);
    }

    // Start cleanup interval for stale backoff entries
    cleanupIntervalId = setInterval(() => {
        const favorites = getAllFavorites();
        if (favorites instanceof Error) return;

        const favoriteIds = new Set(favorites.map((favorite) => favorite.id));
        const now = Date.now();

        for (const [channelId, state] of channelBackoffState) {
            const expiredLongAgo = now > state.nextAttemptAt + (24 * 60 * 60 * 1000);
            if (!favoriteIds.has(channelId) || expiredLongAgo) {
                channelBackoffState.delete(channelId);
            }
        }
    }, 60 * 60 * 1000); // Cleanup every hour

    scheduleNextRefresh();
    console.log("[video-cache] Background refresh started");
}

function stopBackgroundRefresh() {
    if (refreshIntervalId !== null) {
        clearTimeout(refreshIntervalId);
        refreshIntervalId = null;
    }
    if (cleanupIntervalId !== null) {
        clearInterval(cleanupIntervalId);
        cleanupIntervalId = null;
    }
    console.log("[video-cache] Background refresh stopped");
}

function processLiveStateChanges(currentStreams: Array<TwitchStream>) {
    const currentlyLiveChannelIds = currentStreams.map((stream) => stream.user_id);
    return processLiveStateChangesAtomic(currentlyLiveChannelIds);
}

function getChannelsWithVideos(channelIds: Array<string>) {
    return getChannelCacheBulk(channelIds);
}

async function refreshOfflineChannelsBatched(channelIds: Array<string>) {
    // Batch the refresh to avoid rate limits and overwhelming the API
    for (let batchStartIndex = 0; batchStartIndex < channelIds.length; batchStartIndex += BATCH_SIZE) {
        const batch = channelIds.slice(batchStartIndex, batchStartIndex + BATCH_SIZE);

        await Promise.allSettled(
            batch.map((channelId) => refreshVideosForChannelSafe(channelId))
        );

        if (batchStartIndex + BATCH_SIZE < channelIds.length) {
            await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
    }
}

export {
    getChannelsWithVideos,
    populateInitialCache,
    processLiveStateChanges,
    refreshOfflineChannelsBatched,
    startBackgroundRefresh,
    stopBackgroundRefresh,
};
```

---

## Phase 6: API Integration

### File: `src/app/api/channels/index.ts`

Update the GET handler to use the cache:

```typescript
import {
    getChannelsWithVideos,
    processLiveStateChanges,
    refreshOfflineChannelsBatched,
} from "@/src/services/video-cache-service";

import type { CachedVideoSelect } from "@/src/db/schema";

// In the handler, after fetching live streams:

// 1. Parallelize Twitch API calls
const [streamsResult, followedResult] = await Promise.all([
    getFollowedStreams(authResult.userId),
    getFollowedChannels(authResult.userId),
]);

if (streamsResult instanceof Error) {
    return createErrorResponse(streamsResult.message, ErrorCode.TWITCH_API_ERROR, 500);
}

if (followedResult instanceof Error) {
    return createErrorResponse(followedResult.message, ErrorCode.TWITCH_API_ERROR, 500);
}

// 2. Process live state changes (detect offline transitions)
const channelsThatWentOffline = processLiveStateChanges(streamsResult);

// 3. Refresh videos for channels that just went offline (batched to avoid rate limits)
if (!(channelsThatWentOffline instanceof Error) && channelsThatWentOffline.length > 0) {
    // Fire and forget - don't block response for VOD refresh
    refreshOfflineChannelsBatched(channelsThatWentOffline).catch((error) => {
        console.error("[channels-api] Failed to refresh offline channels:", error);
    });
}

// 4. Get cached videos for offline favorites
const offlineFavoriteIds = offlineFavorites.map((favorite) => favorite.channelId);
const cachedChannels = getChannelsWithVideos(offlineFavoriteIds);

// 5. Build response using cached video data
const videosByChannelId = new Map<string, CachedVideoSelect>();
if (!(cachedChannels instanceof Error)) {
    for (const cached of cachedChannels) {
        if (cached.latestVideo !== null) {
            videosByChannelId.set(cached.channelId, cached.latestVideo);
        }
    }
}
```

---

## Phase 7: React Component Updates

### Pattern: Children Call Hooks Directly

To eliminate stale closure bugs with React.memo, components should call mutation hooks directly instead of receiving callback props.

### File: `src/shared/query-keys.ts`

Create a shared module for query keys to avoid cross-feature imports:

```typescript
export const QUERY_KEYS = {
    channels: ["channels"] as const,
    followedChannels: ["followed-channels"] as const,
} as const;
```

### File: `src/features/channels/hooks/use-channels.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/src/shared/query-keys";

import { reorderFavoritesApi, toggleFavorite } from "../api/channels-mutations";
import { fetchChannels } from "../api/channels-queries";

import type { Channel } from "../channels.types";
import type { SidebarChannel } from "@/src/features/sidebar/sidebar.types";

export const CHANNELS_QUERY_KEY = QUERY_KEYS.channels;

function useChannels() {
    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: CHANNELS_QUERY_KEY,
        queryFn: fetchChannels,
        staleTime: 30_000,
        gcTime: 5 * 60 * 1000,
        refetchInterval: 30_000,
        refetchIntervalInBackground: false,
    });

    return {
        channels: data ?? [],
        isLoading,
        isFetching,
        error: error instanceof Error ? error : null,
        refetch,
    };
}

type ToggleFavoriteMutationContext = {
    previousChannels: Array<Channel> | undefined;
    previousFollowedChannels: Array<SidebarChannel> | undefined;
};

function useToggleFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: toggleFavorite,
        onMutate: async (channelId: string) => {
            await Promise.all([
                queryClient.cancelQueries({ queryKey: CHANNELS_QUERY_KEY }),
                queryClient.cancelQueries({ queryKey: QUERY_KEYS.followedChannels }),
            ]);

            const previousChannels = queryClient.getQueryData<Array<Channel>>(CHANNELS_QUERY_KEY);
            const previousFollowedChannels = queryClient.getQueryData<Array<SidebarChannel>>(
                QUERY_KEYS.followedChannels
            );

            if (previousChannels !== undefined) {
                queryClient.setQueryData(
                    CHANNELS_QUERY_KEY,
                    previousChannels.map((channel) => {
                        if (channel.id === channelId) {
                            return { ...channel, isFavorite: !channel.isFavorite };
                        }
                        return channel;
                    })
                );
            }

            if (previousFollowedChannels !== undefined) {
                queryClient.setQueryData(
                    QUERY_KEYS.followedChannels,
                    previousFollowedChannels.map((channel) => {
                        if (channel.id === channelId) {
                            return { ...channel, isFavorite: !channel.isFavorite };
                        }
                        return channel;
                    })
                );
            }

            const context: ToggleFavoriteMutationContext = {
                previousChannels,
                previousFollowedChannels,
            };

            return context;
        },
        onError: (_error, _channelId, context) => {
            if (context?.previousChannels !== undefined) {
                queryClient.setQueryData(CHANNELS_QUERY_KEY, context.previousChannels);
            }
            if (context?.previousFollowedChannels !== undefined) {
                queryClient.setQueryData(QUERY_KEYS.followedChannels, context.previousFollowedChannels);
            }
        },
        onSettled: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: CHANNELS_QUERY_KEY }),
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.followedChannels }),
            ]);
        },
    });
}

function useReorderFavorites() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: reorderFavoritesApi,
        onMutate: async (orderedIds: Array<string>) => {
            await queryClient.cancelQueries({ queryKey: CHANNELS_QUERY_KEY });

            const previousChannels = queryClient.getQueryData<Array<Channel>>(CHANNELS_QUERY_KEY);

            if (previousChannels !== undefined) {
                const favoriteChannels: Array<Channel> = [];
                const nonFavoriteChannels: Array<Channel> = [];

                for (const channel of previousChannels) {
                    if (channel.isFavorite) {
                        favoriteChannels.push(channel);
                    } else {
                        nonFavoriteChannels.push(channel);
                    }
                }

                const reorderedFavorites: Array<Channel> = [];

                for (const id of orderedIds) {
                    const channel = favoriteChannels.find(
                        (favoriteChannel) => favoriteChannel.id === id
                    );

                    if (channel !== undefined) {
                        reorderedFavorites.push(channel);
                    }
                }

                queryClient.setQueryData(CHANNELS_QUERY_KEY, [
                    ...reorderedFavorites,
                    ...nonFavoriteChannels,
                ]);
            }

            return { previousChannels };
        },
        onError: (_error, _orderedIds, context) => {
            if (context?.previousChannels !== undefined) {
                queryClient.setQueryData(CHANNELS_QUERY_KEY, context.previousChannels);
            }
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: CHANNELS_QUERY_KEY });
        },
    });
}

export { useChannels, useReorderFavorites, useToggleFavorite };
```

### File: `src/features/channels/components/channel-card.tsx`

Remove `onToggleFavorite` prop - call hook directly with accessibility improvements:

```typescript
import { memo } from "react";

import { useToggleFavorite } from "../hooks/use-channels";

import type { Channel } from "../channels.types";

type ChannelCardProps = {
    channel: Channel;
    variant?: "full" | "compact";
};

function ChannelCardComponent({ channel, variant = "full" }: ChannelCardProps) {
    const toggleFavoriteMutation = useToggleFavorite();

    const isToggling = toggleFavoriteMutation.isPending &&
        toggleFavoriteMutation.variables === channel.id;

    function handleFavoriteClick(event: React.MouseEvent) {
        event.stopPropagation();
        if (!isToggling) {
            toggleFavoriteMutation.mutate(channel.id);
        }
    }

    const favoriteButtonLabel = channel.isFavorite
        ? `Remove ${channel.displayName} from favorites`
        : `Add ${channel.displayName} to favorites`;

    // In the JSX, the favorite button should include:
    // Note: Native <button> elements already handle Enter/Space keys - no onKeyDown needed
    // <button
    //     type="button"
    //     onClick={handleFavoriteClick}
    //     disabled={isToggling}
    //     aria-label={favoriteButtonLabel}
    //     aria-pressed={channel.isFavorite}
    //     className={isToggling ? "opacity-50 cursor-not-allowed" : ""}
    // >

    // ... rest of component
}

const ChannelCard = memo(ChannelCardComponent);

export { ChannelCard };
```

### File: `src/features/channels/components/channel-grid.tsx`

Remove callback props, add `useMemo` for categorization:

```typescript
import { memo, useMemo, useRef, useState } from "react";

import { useReorderFavorites } from "../hooks/use-channels";

import { ChannelCard } from "./channel-card";

import type { Channel } from "../channels.types";

type ChannelGridProps = {
    channels: Array<Channel>;
};

function ChannelGrid({ channels }: ChannelGridProps) {
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const dragCounter = useRef(0);

    const reorderFavoritesMutation = useReorderFavorites();

    const { liveFavorites, offlineFavorites, nonFavoriteChannels, allFavorites } = useMemo(() => {
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

        return {
            liveFavorites: live,
            offlineFavorites: offline,
            nonFavoriteChannels: nonFavorite,
            allFavorites: [...live, ...offline],
        };
    }, [channels]);

    // Drag handlers call reorderFavoritesMutation.mutate() directly

    return (
        <div className="space-y-8">
            {liveFavorites.length > 0 && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
                    {liveFavorites.map((channel) => (
                        <div key={channel.id} /* drag handlers */>
                            <ChannelCard channel={channel} variant="full" />
                        </div>
                    ))}
                </div>
            )}
            {/* ... other sections ... */}
        </div>
    );
}

export { ChannelGrid };
```

### File: `src/features/sidebar/hooks/use-followed-channels.ts`

```typescript
import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "@/src/shared/query-keys";

import { fetchFollowedChannels } from "../api/sidebar-queries";

export const FOLLOWED_CHANNELS_QUERY_KEY = QUERY_KEYS.followedChannels;

function useFollowedChannels() {
    const { data, isLoading, error } = useQuery({
        queryKey: FOLLOWED_CHANNELS_QUERY_KEY,
        queryFn: fetchFollowedChannels,
        staleTime: 60_000,
        gcTime: 10 * 60 * 1000,
        refetchInterval: 60_000,
        refetchIntervalInBackground: false,
    });

    return {
        channels: data ?? [],
        isLoading,
        error: error instanceof Error ? error : null,
    };
}

export { useFollowedChannels };
```

---

## Phase 8: Server Startup

### File: `src/lib/startup.ts`

```typescript
import { getAuth } from "@/src/features/auth/auth.repository";
import {
    populateInitialCache,
    startBackgroundRefresh,
} from "@/src/services/video-cache-service";

async function initializeVideoCache() {
    console.log("[startup] Starting video cache initialization...");
    const startTime = Date.now();

    // Populate cache - this runs to completion or logs warnings on failure
    const result = await populateInitialCache();

    if (result instanceof Error) {
        console.warn(`[startup] Cache initialization had errors: ${result.message}`);
    } else {
        console.log(`[startup] Cache initialized in ${Date.now() - startTime}ms`);
    }

    // Start background refresh even if populateInitialCache had errors
    startBackgroundRefresh();
}

export { initializeVideoCache };
```

### File: `src/server.ts`

TanStack Start discovers server entry by file convention at `src/server.ts`. The entry must export a WinterCG-compatible `ServerEntry` interface wrapped with `createServerEntry`.

```typescript
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import { initializeVideoCache } from "./lib/startup";

// Prevent re-initialization on hot reload in development
declare global {
    var __vodCacheInitialized: boolean | undefined;
}

if (!globalThis.__vodCacheInitialized) {
    globalThis.__vodCacheInitialized = true;

    // Start initialization in background - do NOT block requests
    // First requests may have cache misses, which fall back to direct Twitch API calls
    initializeVideoCache().catch((error) => {
        console.error("[startup] Video cache initialization failed:", error);
    });
}

export default createServerEntry({
    fetch(request) {
        return handler.fetch(request);
    },
});
```

**Note:** For custom request handling (logging, auth checks, etc.), use `createStartHandler` with `defineHandlerCallback`:

```typescript
import { createStartHandler, defaultStreamHandler, defineHandlerCallback } from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";

const customHandler = defineHandlerCallback((context) => {
    // Add custom logic here
    return defaultStreamHandler(context);
});

const fetch = createStartHandler(customHandler);

export default createServerEntry({ fetch });
```

---

## Performance Optimizations

### Image Loading with Explicit Dimensions

```typescript
{channels.map((channel, renderIndex) => (
    <img
        key={channel.id}
        src={thumbnailUrl}
        alt={channel.displayName}
        width={440}
        height={248}
        className="w-full h-full object-cover"
        loading={renderIndex < 6 ? "eager" : "lazy"}
        fetchPriority={renderIndex < 6 ? "high" : "auto"}
    />
))}
```

### Query Configuration Summary

| Query | staleTime | refetchInterval | gcTime |
|-------|-----------|-----------------|--------|
| Main Grid | 30s | 30s | 5 min |
| Sidebar | 60s | 60s | 10 min |

### Backoff Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| Base backoff | 1 min | Initial retry delay after first failure |
| Max backoff | 1 hour | Maximum delay between retries |
| Jitter | 0-30% | Random variance to prevent thundering herd |

---

## Verification Checklist

1. **Non-blocking startup** - Server accepts requests immediately, cache populates in background
2. **Instant cache hit** - VODs appear immediately on page load after cache is warm
3. **Live status refresh** - Network tab shows `/api/channels` requests every 30 seconds
4. **Live status NOT cached** - When a channel goes live, it appears within 30 seconds
5. **Background refresh** - Logs show refresh activity distributed over time (interval scales with favorites count)
6. **Offline detection** - When a channel goes offline, new VOD fetched (batched, non-blocking)
7. **Optimistic updates** - Favorite toggle updates both grid and sidebar instantly
8. **Error recovery** - Stale cache data served when Twitch API unavailable
9. **Backoff working** - Failed channels use exponential backoff with jitter

---

## File Summary

| File | Action |
|------|--------|
| `src/db/schema.ts` | Add `cachedVods` and `channelCache` tables |
| `src/features/vods/vods.types.ts` | Create type definitions (import from schema) |
| `src/features/vods/vods.repository.ts` | Create VOD CRUD functions |
| `src/features/vods/channel-cache.repository.ts` | Create cache CRUD functions |
| `src/services/video-cache-service.ts` | Create cache orchestration service |
| `src/shared/query-keys.ts` | Create shared query keys module |
| `src/lib/startup.ts` | Create startup initialization function |
| `src/server.ts` | Create custom server entry for TanStack Start |
| `src/app/api/channels/index.ts` | Integrate cache with API |
| `src/features/channels/hooks/use-channels.ts` | Update query config, add optimistic updates |
| `src/features/channels/components/channel-card.tsx` | Call hook directly, add memo, accessibility |
| `src/features/channels/components/channel-grid.tsx` | Add useMemo, call reorder hook directly |
| `src/features/sidebar/hooks/use-followed-channels.ts` | Update query config |
