# VOD Playback Tracking Implementation Plan

## Overview

Implement the ability to remember and resume playback position in VODs. Since VLC runs independently and we cannot automatically detect playback position, this will be a manual save/resume system.

## Technical Approach

Streamlink supports `--player-args` which can pass arguments to VLC. VLC supports `--start-time=X` to start playback at a specific timestamp in seconds.

## Database Changes

### New Table: `vod_playback_progress`

```typescript
// src/db/schema.ts
export const vodPlaybackProgress = sqliteTable("vod_playback_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vodId: text("vod_id").notNull().unique(),
  channelId: text("channel_id").notNull(),
  channelName: text("channel_name").notNull(), // Denormalized for display performance
  vodTitle: text("vod_title").notNull(),
  positionSeconds: integer("position_seconds").notNull(),
  durationSeconds: integer("duration_seconds"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("vod_progress_channel_idx").on(table.channelId),
  index("vod_progress_updated_idx").on(table.updatedAt),
]);

// Type inference exports
export type VodPlaybackProgressSelect = typeof vodPlaybackProgress.$inferSelect;
export type VodPlaybackProgressInsert = typeof vodPlaybackProgress.$inferInsert;
```

## Repository

### New File: `src/features/vods/playback-progress.repository.ts`

All functions return `T | Error` pattern. Use `.returning()` to verify operations.

```typescript
import { eq, desc } from "drizzle-orm";

import { database } from "@/db";
import { vodPlaybackProgress } from "@/db/schema";

import type { VodPlaybackProgressSelect } from "@/db/schema";

type SaveProgressInput = {
  vodId: string;
  channelId: string;
  channelName: string;
  vodTitle: string;
  positionSeconds: number;
  durationSeconds?: number;
};

function getPlaybackProgress(vodId: string) {
  try {
    const row = database
      .select()
      .from(vodPlaybackProgress)
      .where(eq(vodPlaybackProgress.vodId, vodId))
      .get();

    return row ?? null;
  } catch (error) {
    console.error("[playback-progress.repository] getPlaybackProgress failed:", error);
    return new Error("Failed to get playback progress");
  }
}

function getPlaybackProgressBulk(vodIds: Array<string>) {
  try {
    if (vodIds.length === 0) {
      return [];
    }

    const rows = database
      .select()
      .from(vodPlaybackProgress)
      .where(inArray(vodPlaybackProgress.vodId, vodIds))
      .all();

    return rows;
  } catch (error) {
    console.error("[playback-progress.repository] getPlaybackProgressBulk failed:", error);
    return new Error("Failed to get playback progress");
  }
}

function savePlaybackProgress(data: SaveProgressInput) {
  try {
    if (data.positionSeconds < 0) {
      return new Error("Position cannot be negative");
    }

    const result = database
      .insert(vodPlaybackProgress)
      .values({
        vodId: data.vodId,
        channelId: data.channelId,
        channelName: data.channelName,
        vodTitle: data.vodTitle,
        positionSeconds: data.positionSeconds,
        durationSeconds: data.durationSeconds ?? null,
      })
      .onConflictDoUpdate({
        target: vodPlaybackProgress.vodId,
        set: {
          positionSeconds: data.positionSeconds,
          durationSeconds: data.durationSeconds ?? null,
          vodTitle: data.vodTitle,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning({ id: vodPlaybackProgress.id })
      .get();

    if (result === undefined) {
      return new Error("Upsert did not return a row");
    }

    return null;
  } catch (error) {
    console.error("[playback-progress.repository] savePlaybackProgress failed:", error);
    return new Error("Failed to save playback progress");
  }
}

function deletePlaybackProgress(vodId: string) {
  try {
    const deleted = database
      .delete(vodPlaybackProgress)
      .where(eq(vodPlaybackProgress.vodId, vodId))
      .returning({ vodId: vodPlaybackProgress.vodId })
      .all();

    return deleted.length > 0;
  } catch (error) {
    console.error("[playback-progress.repository] deletePlaybackProgress failed:", error);
    return new Error("Failed to delete playback progress");
  }
}

function getRecentProgress(limit = 10) {
  try {
    const rows = database
      .select()
      .from(vodPlaybackProgress)
      .orderBy(desc(vodPlaybackProgress.updatedAt))
      .limit(limit)
      .all();

    return rows;
  } catch (error) {
    console.error("[playback-progress.repository] getRecentProgress failed:", error);
    return new Error("Failed to get recent progress");
  }
}

export {
  getPlaybackProgress,
  getPlaybackProgressBulk,
  savePlaybackProgress,
  deletePlaybackProgress,
  getRecentProgress,
};

export type { SaveProgressInput };
```

## Service Changes

### Update: `src/services/streamlink-service.ts`

Modify `launchVod()` to accept an optional start time:

```typescript
function launchVod(vodId: string, startTimeSeconds?: number) {
  const sanitizedId = vodId.replace(/[^0-9]/g, "");
  const url = `twitch.tv/videos/${sanitizedId}`;

  if (startTimeSeconds !== undefined && startTimeSeconds > 0) {
    return launchStreamWithArgs(url, `--start-time=${startTimeSeconds}`);
  }

  return launchStream(url);
}

function launchStreamWithArgs(url: string, playerArgs: string) {
  return new Promise<void>((resolve, reject) => {
    execFile(
      STREAMLINK_PATH,
      [url, "best", "--player-args", playerArgs],
      (error) => {
        if (error) {
          reject(new Error(`Failed to launch stream: ${error.message}`));
          return;
        }
        resolve();
      }
    );
  });
}
```

## API Changes

### Response Types

```typescript
// src/features/vods/vods.types.ts
type VodProgressResponse = {
  progress: VodPlaybackProgressSelect | null;
};

type VodProgressBulkResponse = {
  progress: Array<VodPlaybackProgressSelect>;
};

type RecentProgressResponse = {
  progress: Array<VodPlaybackProgressSelect>;
};

type SaveProgressResponse = {
  success: boolean;
};

type DeleteProgressResponse = {
  success: boolean;
};
```

### Validation

```typescript
// src/features/vods/vods.validators.ts
function parseSaveProgressBody(body: unknown) {
  if (typeof body !== "object" || body === null) {
    return new Error("Invalid request body");
  }

  if (!("vodId" in body) || typeof body.vodId !== "string") {
    return new Error("Missing or invalid vodId");
  }

  if (!("channelId" in body) || typeof body.channelId !== "string") {
    return new Error("Missing or invalid channelId");
  }

  if (!("channelName" in body) || typeof body.channelName !== "string") {
    return new Error("Missing or invalid channelName");
  }

  if (!("vodTitle" in body) || typeof body.vodTitle !== "string") {
    return new Error("Missing or invalid vodTitle");
  }

  if (!("positionSeconds" in body) || typeof body.positionSeconds !== "number") {
    return new Error("Missing or invalid positionSeconds");
  }

  const durationSeconds = "durationSeconds" in body && typeof body.durationSeconds === "number"
    ? body.durationSeconds
    : undefined;

  return {
    vodId: body.vodId,
    channelId: body.channelId,
    channelName: body.channelName,
    vodTitle: body.vodTitle,
    positionSeconds: body.positionSeconds,
    durationSeconds,
  };
}
```

### Update: `POST /api/watch/vod/$id`

Accept optional body with `startTime`:

```typescript
// src/app/api/watch/vod/$id/index.ts
export const Route = createFileRoute("/api/watch/vod/$id/")({
  server: {
    handlers: {
      POST: async function handler({ params, request }) {
        const auth = requireAuth();
        if (!auth.authenticated) return auth.response;

        const { id } = params;
        let startTime: number | undefined;

        try {
          const body = await request.json();
          if (typeof body.startTime === "number" && body.startTime > 0) {
            startTime = body.startTime;
          }
        } catch {
          // No body or invalid JSON - proceed without startTime
        }

        const result = await launchVod(id, startTime);
        if (result instanceof Error) {
          return Response.json({ error: result.message }, { status: 500 });
        }

        return Response.json({ success: true });
      },
    },
  },
});
```

### New: `GET /api/vod-progress` and `POST /api/vod-progress`

```typescript
// src/app/api/vod-progress/index.ts
export const Route = createFileRoute("/api/vod-progress/")({
  server: {
    handlers: {
      GET: async function handler({ request }) {
        const auth = requireAuth();
        if (!auth.authenticated) return auth.response;

        const url = new URL(request.url);
        const idsParam = url.searchParams.get("ids");

        if (idsParam) {
          const ids = idsParam.split(",").filter(Boolean);
          const result = getPlaybackProgressBulk(ids);
          if (result instanceof Error) {
            return Response.json({ error: result.message }, { status: 500 });
          }
          return Response.json({ progress: result });
        }

        const result = getRecentProgress();
        if (result instanceof Error) {
          return Response.json({ error: result.message }, { status: 500 });
        }

        return Response.json({ progress: result });
      },
      POST: async function handler({ request }) {
        const auth = requireAuth();
        if (!auth.authenticated) return auth.response;

        const body = await request.json();
        const parsed = parseSaveProgressBody(body);

        if (parsed instanceof Error) {
          return Response.json({ error: parsed.message }, { status: 400 });
        }

        const result = savePlaybackProgress(parsed);
        if (result instanceof Error) {
          return Response.json({ error: result.message }, { status: 500 });
        }

        return Response.json({ success: true }, { status: 201 });
      },
    },
  },
});
```

### New: `GET /api/vod-progress/$id` and `DELETE /api/vod-progress/$id`

```typescript
// src/app/api/vod-progress/$id/index.ts
export const Route = createFileRoute("/api/vod-progress/$id/")({
  server: {
    handlers: {
      GET: async function handler({ params }) {
        const auth = requireAuth();
        if (!auth.authenticated) return auth.response;

        const result = getPlaybackProgress(params.id);
        if (result instanceof Error) {
          return Response.json({ error: result.message }, { status: 500 });
        }

        return Response.json({ progress: result });
      },
      DELETE: async function handler({ params }) {
        const auth = requireAuth();
        if (!auth.authenticated) return auth.response;

        const result = deletePlaybackProgress(params.id);
        if (result instanceof Error) {
          return Response.json({ error: result.message }, { status: 500 });
        }

        return Response.json({ success: result });
      },
    },
  },
});
```

## Frontend Changes

### Query Keys: `src/shared/query-keys.ts`

```typescript
export const QUERY_KEYS = {
  // ... existing keys
  vodProgress: ["vod-progress"] as const,
  vodProgressRecent: ["vod-progress", "recent"] as const,
};

export function getVodProgressQueryKey(vodId: string) {
  return ["vod-progress", vodId] as const;
}

export function getVodProgressBulkQueryKey(vodIds: Array<string>) {
  return ["vod-progress", "bulk", vodIds.sort().join(",")] as const;
}
```

### Queries: `src/features/vods/api/vods-queries.ts`

```typescript
async function fetchVodProgress(vodId: string) {
  const response = await fetch(`/api/vod-progress/${vodId}`);
  if (!response.ok) {
    const message = await extractApiErrorMessage(response);
    throw new Error(message);
  }
  const data = await response.json();
  return data.progress;
}

async function fetchVodProgressBulk(vodIds: Array<string>) {
  if (vodIds.length === 0) {
    return [];
  }
  const response = await fetch(`/api/vod-progress?ids=${vodIds.join(",")}`);
  if (!response.ok) {
    const message = await extractApiErrorMessage(response);
    throw new Error(message);
  }
  const data = await response.json();
  return data.progress;
}

async function fetchRecentProgress() {
  const response = await fetch("/api/vod-progress");
  if (!response.ok) {
    const message = await extractApiErrorMessage(response);
    throw new Error(message);
  }
  const data = await response.json();
  return data.progress;
}
```

### Mutations: `src/features/vods/api/vods-mutations.ts`

```typescript
async function watchVod(id: string, startTimeSeconds?: number) {
  const options: RequestInit = { method: "POST" };

  if (startTimeSeconds !== undefined && startTimeSeconds > 0) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify({ startTime: startTimeSeconds });
  }

  const response = await fetch(`/api/watch/vod/${id}`, options);
  if (!response.ok) {
    const message = await extractApiErrorMessage(response);
    throw new Error(message);
  }
}

async function saveVodProgress(data: SaveProgressInput) {
  const response = await fetch("/api/vod-progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const message = await extractApiErrorMessage(response);
    throw new Error(message);
  }
}

async function deleteVodProgress(vodId: string) {
  const response = await fetch(`/api/vod-progress/${vodId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const message = await extractApiErrorMessage(response);
    throw new Error(message);
  }
}
```

### Hooks: `src/features/vods/hooks/use-vod-progress.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { QUERY_KEYS, getVodProgressQueryKey, getVodProgressBulkQueryKey } from "@/shared/query-keys";

import { fetchVodProgress, fetchVodProgressBulk, fetchRecentProgress } from "../api/vods-queries";
import { saveVodProgress, deleteVodProgress } from "../api/vods-mutations";

import type { SaveProgressInput } from "../playback-progress.repository";

function useVodProgress(vodId: string) {
  return useQuery({
    queryKey: getVodProgressQueryKey(vodId),
    queryFn: () => fetchVodProgress(vodId),
    enabled: vodId !== "",
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000,
  });
}

function useVodProgressBulk(vodIds: Array<string>) {
  return useQuery({
    queryKey: getVodProgressBulkQueryKey(vodIds),
    queryFn: () => fetchVodProgressBulk(vodIds),
    enabled: vodIds.length > 0,
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000,
  });
}

function useRecentProgress() {
  return useQuery({
    queryKey: QUERY_KEYS.vodProgressRecent,
    queryFn: fetchRecentProgress,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

function useSaveProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveVodProgress,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: getVodProgressQueryKey(variables.vodId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vodProgress });
    },
  });
}

function useDeleteProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVodProgress,
    onSuccess: (_, vodId) => {
      queryClient.invalidateQueries({ queryKey: getVodProgressQueryKey(vodId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.vodProgress });
    },
  });
}

export {
  useVodProgress,
  useVodProgressBulk,
  useRecentProgress,
  useSaveProgress,
  useDeleteProgress,
};
```

### UI Updates

#### VodCard Updates (with memoization)

```typescript
// src/app/vods.tsx
import { memo, useCallback } from "react";

type VodCardProps = {
  vod: TwitchVideo;
  progress: VodPlaybackProgressSelect | null;
  onWatch: (id: string, startTimeSeconds?: number) => void;
  onSaveProgress: (data: SaveProgressInput) => void;
};

const VodCard = memo(function VodCard({ vod, progress, onWatch, onSaveProgress }: VodCardProps) {
  // Derived state - NOT useState
  const hasProgress = progress !== null;
  const progressPercent = hasProgress && progress.durationSeconds
    ? (progress.positionSeconds / progress.durationSeconds) * 100
    : 0;

  function handleWatchClick() {
    onWatch(vod.id);
  }

  function handleResumeClick() {
    if (hasProgress) {
      onWatch(vod.id, progress.positionSeconds);
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-lg bg-surface-card">
      {/* Thumbnail */}
      <div className="relative aspect-video">
        <img src={formatThumbnail(vod.thumbnail_url, 440, 248)} alt={vod.title} />
        {/* Progress bar - always reserve space to prevent CLS */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
          <div
            className="h-full bg-twitch-purple transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{vod.title}</h3>
        {hasProgress && (
          <p className="text-xs text-text-secondary">
            Watched {formatDuration(progress.positionSeconds)}
          </p>
        )}
        <p className="text-xs text-text-secondary">{formatDate(vod.created_at)}</p>

        {/* Buttons */}
        <div className="mt-2 flex gap-2">
          {hasProgress && (
            <button onClick={handleResumeClick} className="btn-primary text-sm">
              Resume
            </button>
          )}
          <button onClick={handleWatchClick} className="btn-secondary text-sm">
            {hasProgress ? "Start Over" : "Watch in VLC"}
          </button>
        </div>
      </div>
    </div>
  );
});
```

#### VodsPage Updates (batch fetching)

```typescript
// src/app/vods.tsx
function VodsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const { data, isLoading, error } = useVodSearch(searchQuery);

  // Batch fetch progress for all VODs
  const vodIds = data?.videos.map((video) => video.id) ?? [];
  const { data: progressData } = useVodProgressBulk(vodIds);

  // Create a map for O(1) lookup
  const progressMap = useMemo(() => {
    const map = new Map<string, VodPlaybackProgressSelect>();
    if (progressData) {
      for (const item of progressData) {
        map.set(item.vodId, item);
      }
    }
    return map;
  }, [progressData]);

  const saveProgressMutation = useSaveProgress();

  const handleWatch = useCallback((vodId: string, startTimeSeconds?: number) => {
    watchVod(vodId, startTimeSeconds).catch((error: unknown) => {
      console.error("Failed to launch VOD:", error);
    });
  }, []);

  const handleSaveProgress = useCallback((data: SaveProgressInput) => {
    saveProgressMutation.mutate(data);
  }, [saveProgressMutation]);

  // ... rest of component

  return (
    <div className="grid gap-4">
      {data.videos.map((vod) => (
        <VodCard
          key={vod.id}
          vod={vod}
          progress={progressMap.get(vod.id) ?? null}
          onWatch={handleWatch}
          onSaveProgress={handleSaveProgress}
        />
      ))}
    </div>
  );
}
```

## File Changes Summary

### New Files
- `src/features/vods/playback-progress.repository.ts`
- `src/features/vods/hooks/use-vod-progress.ts`
- `src/app/api/vod-progress/index.ts`
- `src/app/api/vod-progress/$id/index.ts`
- `drizzle/XXXX_vod_playback_progress.sql` (generated)

### Modified Files
- `src/db/schema.ts` - Add vodPlaybackProgress table and type exports
- `src/services/streamlink-service.ts` - Add startTime parameter and launchStreamWithArgs
- `src/app/api/watch/vod/$id/index.ts` - Accept startTime in body
- `src/features/vods/vods.types.ts` - Add response types
- `src/features/vods/vods.validators.ts` - Add parseSaveProgressBody
- `src/features/vods/api/vods-mutations.ts` - Update watchVod, add progress mutations
- `src/features/vods/api/vods-queries.ts` - Add progress queries
- `src/app/vods.tsx` - Update VodCard with progress UI, memoization
- `src/shared/query-keys.ts` - Add vodProgress query keys

## Performance Considerations

1. **Batch fetching** - Use `useVodProgressBulk` at page level to avoid N+1 queries
2. **staleTime** - 60s for individual progress, 30s for recent list
3. **Memoization** - VodCard wrapped with `memo`, callbacks with `useCallback`
4. **Layout stability** - Progress bar always renders with reserved space
5. **Independent loading** - Progress loads separately from main content
