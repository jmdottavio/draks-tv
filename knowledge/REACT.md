# React Standards

## Component Structure

Use function declarations for components:

```typescript
function ChannelCard({ channel }: ChannelCardProps) {
  return (
    <div className="channel-card">
      {channel.name}
    </div>
  );
}
```

## Hooks

### Rules of Hooks

- Only call hooks at the top level
- Only call hooks from React functions
- Custom hooks must start with `use`

### Derived State

Never use `useState` for values that can be computed:

```typescript
// Good
function ChannelList({ channels }: Props) {
  const liveChannels = channels.filter((ch) => ch.isLive);
  const liveCount = liveChannels.length;

  return <div>Live: {liveCount}</div>;
}

// Bad
function ChannelList({ channels }: Props) {
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    setLiveCount(channels.filter((ch) => ch.isLive).length);
  }, [channels]);

  return <div>Live: {liveCount}</div>;
}
```

### TanStack Query

Use TanStack Query for all data fetching:

```typescript
function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: fetchChannels,
    staleTime: 30_000, // 30 seconds
  });
}

function useFavoriteToggle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}
```

## Conditional Rendering

Use early returns, not ternaries for conditional JSX:

```typescript
// Good
function ChannelCard({ channel }: Props) {
  if (channel.isLive) {
    return <LiveChannelCard channel={channel} />;
  }

  return <OfflineChannelCard channel={channel} />;
}

// Bad
function ChannelCard({ channel }: Props) {
  return channel.isLive
    ? <LiveChannelCard channel={channel} />
    : <OfflineChannelCard channel={channel} />;
}
```

Ternaries are acceptable for simple inline values:

```typescript
<span className={isLive ? 'text-red-500' : 'text-gray-500'}>
  {isLive ? 'Live' : 'Offline'}
</span>
```

## Event Handlers

Name handlers with `handle` prefix:

```typescript
function ChannelCard({ channel, onFavorite }: Props) {
  function handleFavoriteClick() {
    onFavorite(channel.id);
  }

  return (
    <button onClick={handleFavoriteClick}>
      Favorite
    </button>
  );
}
```

## Props

Define props with interface, not inline:

```typescript
interface ChannelCardProps {
  channel: Channel;
  isFavorite: boolean;
  onFavorite: (id: string) => void;
}

function ChannelCard({ channel, isFavorite, onFavorite }: ChannelCardProps) {
  // ...
}
```

## File Naming

- Components: `kebab-case.tsx` (e.g., `channel-card.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-channels.ts`)
- Utilities: `kebab-case.ts` (e.g., `format-duration.ts`)
