# TypeScript Standards

## Type Safety

### No `any`

Never use `any`. Use `unknown` for truly unknown types:

```typescript
// Good
function parseResponse(data: unknown): Channel | Error {
  if (!isChannel(data)) {
    return new Error('Invalid channel data');
  }
  return data;
}

// Bad
function parseResponse(data: any): Channel {
  return data as Channel;
}
```

### Type Assertions

Avoid type assertions (`as`). If needed, validate first:

```typescript
// Good
function getChannelId(data: unknown): string | Error {
  if (typeof data !== 'object' || data === null) {
    return new Error('Invalid data');
  }
  if (!('id' in data) || typeof data.id !== 'string') {
    return new Error('Missing id');
  }
  return data.id;
}

// Bad
function getChannelId(data: unknown): string {
  return (data as { id: string }).id;
}
```

## Error Handling

### Result Pattern

Return `T | Error` instead of throwing:

```typescript
// Good
async function fetchChannel(id: string): Promise<Channel | Error> {
  const response = await fetch(`/api/channels/${id}`);

  if (!response.ok) {
    return new Error(`Failed to fetch channel: ${response.status}`);
  }

  return response.json();
}

// Usage
const result = await fetchChannel('123');

if (result instanceof Error) {
  console.error(result.message);
  return;
}

// result is now typed as Channel
console.log(result.name);
```

### No Try-Catch for Control Flow

Only use try-catch at boundaries (API routes, event handlers):

```typescript
// Good - at API boundary
router.get('/channel/:id', async (req, res) => {
  try {
    const result = await getChannel(req.params.id);

    if (result instanceof Error) {
      res.status(404).json({ error: result.message });
      return;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bad - try-catch for control flow
function getChannel(id: string): Channel {
  try {
    const channel = channels.find((c) => c.id === id);
    if (!channel) throw new Error('Not found');
    return channel;
  } catch {
    return defaultChannel;
  }
}
```

## Arrays

Use `Array<T>` syntax, not `T[]`:

```typescript
// Good
const channels: Array<Channel> = [];
function getChannels(): Array<Channel> {}

// Bad
const channels: Channel[] = [];
function getChannels(): Channel[] {}
```

## Null Handling

Prefer explicit null checks over optional chaining when the null case matters:

```typescript
// Good - when null case needs handling
const channel = channels.find((c) => c.id === id);

if (channel === undefined) {
  return new Error('Channel not found');
}

return channel.name;

// Acceptable - for truly optional access
const thumbnailUrl = channel.stream?.thumbnail;
```

## Type Definitions

Define types for API responses and domain objects:

```typescript
interface Channel {
  id: string;
  login: string;
  displayName: string;
  profileImage: string;
  isLive: boolean;
  isFavorite: boolean;
  stream: Stream | null;
  latestVod: Vod | null;
}

interface Stream {
  title: string;
  gameName: string;
  viewerCount: number;
  thumbnailUrl: string;
}

interface Vod {
  id: string;
  title: string;
  duration: string;
  createdAt: string;
  thumbnailUrl: string;
}
```

## Exports

Use named exports, not default:

```typescript
// Good
export { ChannelCard };
export type { Channel };

// Bad
export default ChannelCard;
```
