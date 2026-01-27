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
- VOD cache pre-populated on server start
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
        videoId: text("video_id").notNull().unique(),
        channelId: text("channel_id").notNull(),
        title: text("title").notNull(),
        duration: text("duration").notNull(),
        createdAt: text("created_at").notNull(),
        thumbnailUrl: text("thumbnail_url").notNull(),
        fetchedAt: text("fetched_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    },
    (table) => [
        index("cached_vods_channel_id_idx").on(table.channelId),
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
import type { cachedVods, channelCache } from "@/src/db/schema";

type CachedVideoSelect = typeof cachedVods.$inferSelect;
type ChannelCacheSelect = typeof channelCache.$inferSelect;

type VideoInput = {
    videoId: string;
    channelId: string;
    title: string;
    duration: string;
    createdAt: string;
    thumbnailUrl: string;
};

type ChannelCacheInput = {
    channelId: string;
    isLive: boolean;
    lastLiveAt: string | null;
    latestVideoId: number | null;
};

type ChannelCacheWithVideo = {
    channelId: string;
    isLive: boolean;
    lastLiveAt: string | null;
    latestVideoId: number | null;
    updatedAt: string;
    latestVideo: CachedVideoSelect | null;
};

type CacheOptions = {
    maxAgeMilliseconds?: number;
    forceRefresh?: boolean;
};

export type {
    CachedVideoSelect,
    CacheOptions,
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
import { desc, eq, sql, and, notInArray } from "drizzle-orm";

import { database } from "@/src/db";
import { cachedVods } from "@/src/db/schema";

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
        const videosToKeep = database
            .select({ id: cachedVods.id })
            .from(cachedVods)
            .where(eq(cachedVods.channelId, channelId))
            .orderBy(desc(cachedVods.createdAt))
            .limit(keepCount)
            .all();

        const idsToKeep = videosToKeep.map((video) => video.id);

        if (idsToKeep.length === 0) {
            const deleted = database
                .delete(cachedVods)
                .where(eq(cachedVods.channelId, channelId))
                .returning({ id: cachedVods.id })
                .all();

            return deleted.length;
        }

        const deleted = database
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
import { eq, inArray, sql, and, notInArray } from "drizzle-orm";

import { database } from "@/src/db";
import { cachedVods, channelCache } from "@/src/db/schema";

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

        const result: ChannelCacheWithVideo = {
            channelId: row.channelId,
            isLive: row.isLive,
            lastLiveAt: row.lastLiveAt,
            latestVideoId: row.latestVideoId,
            updatedAt: row.updatedAt,
            latestVideo: row.latestVideo.id !== null ? row.latestVideo : null,
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

        const results: Array<ChannelCacheWithVideo> = rows.map((row) => ({
            channelId: row.channelId,
            isLive: row.isLive,
            lastLiveAt: row.lastLiveAt,
            latestVideoId: row.latestVideoId,
            updatedAt: row.updatedAt,
            latestVideo: row.latestVideo.id !== null ? row.latestVideo : null,
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
            updatedAt: ReturnType<typeof sql>;
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
        const updated = database
            .update(channelCache)
            .set({
                latestVideoId: latestVideoId,
                updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(channelCache.channelId, channelId))
            .returning({ channelId: channelCache.channelId })
            .get();

        if (updated === undefined) {
            return new Error("Channel cache not found for update");
        }

        return null;
    } catch (error) {
        console.error("[channel-cache.repository] updateLatestVideoId failed:", error);
        return new Error("Failed to update latest video ID");
    }
}

function processLiveStateChangesAtomic(currentlyLiveChannelIds: Array<string>) {
    try {
        // Atomic update: set isLive = false for channels that were live but are now offline
        const wentOffline = database
            .update(channelCache)
            .set({
                isLive: false,
                lastLiveAt: sql`CURRENT_TIMESTAMP`,
                updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(
                and(
                    eq(channelCache.isLive, true),
                    currentlyLiveChannelIds.length > 0
                        ? notInArray(channelCache.channelId, currentlyLiveChannelIds)
                        : sql`1=1`
                )
            )
            .returning({ channelId: channelCache.channelId })
            .all();

        return wentOffline.map((row) => row.channelId);
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
import { database } from "@/src/db";
import { cachedVods, channelCache } from "@/src/db/schema";
import { getVideos } from "@/src/services/twitch-service";
import { getAllFavorites } from "@/src/features/channels/favorites.repository";
import {
    getAllChannelCaches,
    getChannelCacheBulk,
    processLiveStateChangesAtomic,
    updateChannelLiveState,
} from "@/src/features/vods/channel-cache.repository";
import { eq, sql, desc } from "drizzle-orm";

import type { TwitchStream } from "@/src/services/twitch-service";
import type { ChannelCacheWithVideo } from "@/src/features/vods/vods.types";

const VIDEO_CACHE_TTL_MS = 30 * 60 * 1000;
const VIDEOS_PER_CHANNEL_LIMIT = 5;
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 100;

// Track background refresh state
let refreshIntervalId: ReturnType<typeof setInterval> | null = null;
const channelBackoffState = new Map<string, { failureCount: number; nextAttemptAt: number }>();

function refreshVideosForChannel(channelId: string, accessToken: string) {
    return database.transaction(async (transaction) => {
        const videosResult = await getVideos(channelId, accessToken, VIDEOS_PER_CHANNEL_LIMIT);

        if (videosResult instanceof Error) {
            console.error("[video-cache] Failed to fetch videos from Twitch:", videosResult.message);
            throw videosResult;
        }

        if (videosResult.length === 0) {
            return null;
        }

        const latestVideo = videosResult[0];
        if (latestVideo === undefined) {
            return null;
        }

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

        const videoRowId = videoResult.id;

        // Upsert channel cache with foreign key
        transaction
            .insert(channelCache)
            .values({
                channelId: channelId,
                isLive: false,
                latestVideoId: videoRowId,
            })
            .onConflictDoUpdate({
                target: channelCache.channelId,
                set: {
                    latestVideoId: videoRowId,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                },
            })
            .run();

        // Clean up old videos (keep only VIDEOS_PER_CHANNEL_LIMIT)
        const videosToKeep = transaction
            .select({ id: cachedVods.id })
            .from(cachedVods)
            .where(eq(cachedVods.channelId, channelId))
            .orderBy(desc(cachedVods.createdAt))
            .limit(VIDEOS_PER_CHANNEL_LIMIT)
            .all();

        const idsToKeep = videosToKeep.map((video) => video.id);

        if (idsToKeep.length > 0) {
            const keepIdsString = idsToKeep.join(",");
            transaction.run(
                sql`DELETE FROM cached_vods WHERE channel_id = ${channelId} AND id NOT IN (${sql.raw(keepIdsString)})`
            );
        }

        return videoRowId;
    });
}

async function refreshVideosForChannelSafe(channelId: string, accessToken: string) {
    const state = channelBackoffState.get(channelId) ?? { failureCount: 0, nextAttemptAt: 0 };

    const now = Date.now();
    if (now < state.nextAttemptAt) {
        return null;
    }

    try {
        const result = await refreshVideosForChannel(channelId, accessToken);
        channelBackoffState.delete(channelId);
        return result;
    } catch (error) {
        state.failureCount++;
        const backoffMs = Math.min(
            VIDEO_CACHE_TTL_MS * Math.pow(2, state.failureCount - 1),
            24 * 60 * 60 * 1000
        );
        state.nextAttemptAt = now + backoffMs;
        channelBackoffState.set(channelId, state);

        if (state.failureCount >= 5) {
            console.warn(`[video-cache] Channel ${channelId} failed ${state.failureCount} times, backoff: ${backoffMs}ms`);
        }

        return error instanceof Error ? error : new Error("Unknown error");
    }
}

async function populateInitialCache(accessToken: string) {
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

        const results = await Promise.all(
            batch.map(async (favorite) => {
                try {
                    await refreshVideosForChannel(favorite.channelId, accessToken);
                    return null;
                } catch (error) {
                    return error instanceof Error ? error : new Error("Unknown error");
                }
            })
        );

        for (const result of results) {
            if (result instanceof Error) {
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

function startBackgroundRefresh(accessToken: string) {
    if (refreshIntervalId !== null) {
        clearInterval(refreshIntervalId);
    }

    let refreshIndex = 0;

    refreshIntervalId = setInterval(async () => {
        const favorites = getAllFavorites();
        if (favorites instanceof Error || favorites.length === 0) {
            return;
        }

        const currentIndex = refreshIndex % favorites.length;
        const favorite = favorites[currentIndex];

        if (favorite !== undefined) {
            const result = await refreshVideosForChannelSafe(favorite.channelId, accessToken);
            if (result instanceof Error) {
                console.error("[video-cache] Background refresh failed for:", favorite.channelId, result.message);
            }
        }

        refreshIndex++;
    }, VIDEO_CACHE_TTL_MS / 20);

    console.log("[video-cache] Background refresh started");
}

function stopBackgroundRefresh() {
    if (refreshIntervalId !== null) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
        console.log("[video-cache] Background refresh stopped");
    }
}

function processLiveStateChanges(currentStreams: Array<TwitchStream>) {
    const currentlyLiveChannelIds = currentStreams.map((stream) => stream.user_id);
    return processLiveStateChangesAtomic(currentlyLiveChannelIds);
}

function getChannelsWithVideos(channelIds: Array<string>) {
    return getChannelCacheBulk(channelIds);
}

export {
    getChannelsWithVideos,
    populateInitialCache,
    processLiveStateChanges,
    refreshVideosForChannel,
    refreshVideosForChannelSafe,
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
    refreshVideosForChannel,
} from "@/src/services/video-cache-service";

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

// 3. Refresh videos for channels that just went offline
if (!(channelsThatWentOffline instanceof Error)) {
    await Promise.all(
        channelsThatWentOffline.map((channelId) =>
            refreshVideosForChannel(channelId, authResult.accessToken)
        )
    );
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

### File: `src/features/channels/hooks/use-channels.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchChannels } from "../api/channels-queries";
import { toggleFavorite, reorderFavoritesApi } from "../api/channels-mutations";
import { FOLLOWED_CHANNELS_QUERY_KEY } from "@/src/features/sidebar/hooks/use-followed-channels";

import type { Channel } from "../channels.types";
import type { SidebarChannel } from "@/src/features/sidebar/sidebar.types";

export const CHANNELS_QUERY_KEY = ["channels"] as const;

type UseChannelsResult = {
    channels: Array<Channel>;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    refetch: () => void;
};

function useChannels(): UseChannelsResult {
    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: CHANNELS_QUERY_KEY,
        queryFn: fetchChannels,
        staleTime: 25_000,
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
        onMutate: async (channelId: string): Promise<ToggleFavoriteMutationContext> => {
            await Promise.all([
                queryClient.cancelQueries({ queryKey: CHANNELS_QUERY_KEY }),
                queryClient.cancelQueries({ queryKey: FOLLOWED_CHANNELS_QUERY_KEY }),
            ]);

            const previousChannels = queryClient.getQueryData<Array<Channel>>(CHANNELS_QUERY_KEY);
            const previousFollowedChannels = queryClient.getQueryData<Array<SidebarChannel>>(
                FOLLOWED_CHANNELS_QUERY_KEY
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
                    FOLLOWED_CHANNELS_QUERY_KEY,
                    previousFollowedChannels.map((channel) => {
                        if (channel.id === channelId) {
                            return { ...channel, isFavorite: !channel.isFavorite };
                        }
                        return channel;
                    })
                );
            }

            return { previousChannels, previousFollowedChannels };
        },
        onError: (_error, _channelId, context) => {
            if (context?.previousChannels !== undefined) {
                queryClient.setQueryData(CHANNELS_QUERY_KEY, context.previousChannels);
            }
            if (context?.previousFollowedChannels !== undefined) {
                queryClient.setQueryData(FOLLOWED_CHANNELS_QUERY_KEY, context.previousFollowedChannels);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: CHANNELS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: FOLLOWED_CHANNELS_QUERY_KEY });
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
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: CHANNELS_QUERY_KEY });
        },
    });
}

export { useChannels, useToggleFavorite, useReorderFavorites };
```

### File: `src/features/channels/components/channel-card.tsx`

Remove `onToggleFavorite` prop - call hook directly:

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

    function handleFavoriteClick(event: React.MouseEvent) {
        event.stopPropagation();
        toggleFavoriteMutation.mutate(channel.id);
    }

    // ... rest of component
}

const ChannelCard = memo(ChannelCardComponent);

export { ChannelCard };
```

### File: `src/features/channels/components/channel-grid.tsx`

Remove `onToggleFavorite` prop, add `useMemo` for categorization:

```typescript
import { useState, useRef, useMemo } from "react";

import { ChannelCard } from "./channel-card";

import type { Channel } from "../channels.types";

type ChannelGridProps = {
    channels: Array<Channel>;
    onReorderFavorites: (orderedIds: Array<string>) => void;
};

function ChannelGrid({ channels, onReorderFavorites }: ChannelGridProps) {
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const dragCounter = useRef(0);

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

    // ... drag handlers ...

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

import { fetchFollowedChannels } from "../api/sidebar-queries";

import type { SidebarChannel } from "../sidebar.types";

export const FOLLOWED_CHANNELS_QUERY_KEY = ["followed-channels"] as const;

type UseFollowedChannelsResult = {
    channels: Array<SidebarChannel>;
    isLoading: boolean;
    error: Error | null;
};

function useFollowedChannels(): UseFollowedChannelsResult {
    const { data, isLoading, error } = useQuery({
        queryKey: FOLLOWED_CHANNELS_QUERY_KEY,
        queryFn: fetchFollowedChannels,
        staleTime: 55_000,
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

const STARTUP_TIMEOUT_MS = 30_000;

async function initializeVideoCache() {
    console.log("[startup] Starting video cache initialization...");
    const startTime = Date.now();

    const auth = getAuth();

    if (auth instanceof Error) {
        console.error("[startup] Auth error, skipping video cache initialization:", auth.message);
        return;
    }

    if (auth.accessToken === null) {
        console.log("[startup] No access token available, skipping video cache initialization");
        return;
    }

    try {
        await Promise.race([
            populateInitialCache(auth.accessToken),
            new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error("Cache initialization timed out"));
                }, STARTUP_TIMEOUT_MS);
            }),
        ]);

        console.log(`[startup] Cache initialized in ${Date.now() - startTime}ms`);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.warn(`[startup] Cache initialization failed: ${message}`);
    }

    startBackgroundRefresh(auth.accessToken);
}

export { initializeVideoCache };
```

### File: `src/server.ts`

TanStack Start automatically detects and uses a custom server entry at `src/server.ts` by convention. No vite.config.ts changes required.

```typescript
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import { initializeVideoCache } from "./lib/startup";

// Start initialization at module load time (before server accepts requests)
const initializationPromise = initializeVideoCache();

export default createServerEntry({
    async fetch(request) {
        // Block first request until initialization completes
        await initializationPromise;
        return handler.fetch(request);
    },
});
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
| Main Grid | 25s | 30s | 5 min |
| Sidebar | 55s | 60s | 10 min |

---

## Verification Checklist

1. **Startup cache population** - Server logs show "Starting initial cache population..." before accepting requests
2. **Instant cache hit** - VODs appear immediately on page load (no loading state)
3. **Live status refresh** - Network tab shows `/api/channels` requests every 30 seconds
4. **Live status NOT cached** - When a channel goes live, it appears within 30 seconds
5. **Background refresh** - Logs show refresh activity distributed over time
6. **Offline detection** - When a channel goes offline, new VOD fetched immediately
7. **Optimistic updates** - Favorite toggle updates both grid and sidebar instantly
8. **Error recovery** - Stale cache data served when Twitch API unavailable

---

## File Summary

| File | Action |
|------|--------|
| `src/db/schema.ts` | Add `cachedVods` and `channelCache` tables |
| `src/features/vods/vods.types.ts` | Create type definitions |
| `src/features/vods/vods.repository.ts` | Create VOD CRUD functions |
| `src/features/vods/channel-cache.repository.ts` | Create cache CRUD functions |
| `src/services/video-cache-service.ts` | Create cache orchestration service |
| `src/lib/startup.ts` | Create startup initialization function |
| `src/server.ts` | Create custom server entry for TanStack Start |
| `src/app/api/channels/index.ts` | Integrate cache with API |
| `src/features/channels/hooks/use-channels.ts` | Update query config, add optimistic updates |
| `src/features/channels/components/channel-card.tsx` | Call hook directly, add memo |
| `src/features/channels/components/channel-grid.tsx` | Add useMemo, remove callback prop |
| `src/features/sidebar/hooks/use-followed-channels.ts` | Update query config |
