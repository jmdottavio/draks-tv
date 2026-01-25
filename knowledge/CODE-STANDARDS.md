# Code Standards

## Functions

Use function declarations, not arrow function variables:

```typescript
// Good
function fetchChannels() {
  return fetch('/api/channels');
}

// Bad
const fetchChannels = () => {
  return fetch('/api/channels');
};
```

Arrow functions are acceptable for:
- Inline callbacks: `array.map((item) => item.id)`
- Event handlers in JSX: `onClick={() => handleClick()}`

## Naming

- **Files**: `kebab-case.ts` (e.g., `channel-card.tsx`, `twitch-service.ts`)
- **Components**: `PascalCase` (e.g., `ChannelCard`, `VodList`)
- **Functions/variables**: `camelCase` (e.g., `fetchChannels`, `isLive`)
- **Constants**: `SCREAMING_SNAKE_CASE` for true constants only

No abbreviations in names:

```typescript
// Good
function getChannelById(channelId: string) {}
const channelList = channels.filter(isLive);

// Bad
function getChnlById(chnlId: string) {}
const chnlLst = channels.filter(isLive);
```

## Imports

Organize imports in this order, separated by blank lines:

1. External packages
2. Internal modules (aliased with `@/`)
3. Relative imports
4. Types (using `type` keyword)

```typescript
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { formatDuration } from '@/lib/format';

import { ChannelCard } from './channel-card';

import type { Channel } from '@/types';
```

## Array Methods

No chaining array methods. Use intermediate variables:

```typescript
// Good
const liveChannels = channels.filter((channel) => channel.isLive);
const channelNames = liveChannels.map((channel) => channel.name);

// Bad
const channelNames = channels
  .filter((channel) => channel.isLive)
  .map((channel) => channel.name);
```

## Comments

Only add comments when the code isn't self-explanatory. No JSDoc unless generating documentation.
