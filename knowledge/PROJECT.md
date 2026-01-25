# Project Standards

## Package Manager

Use Bun for all package operations:

```bash
bun install           # Install dependencies
bun add <package>     # Add dependency
bun run dev           # Run development server
bun run build         # Build for production
```

## API Routes

Route handlers in `src/server/routes/`. Each route file exports a router:

```typescript
import { Router } from 'express';

import { getTwitchChannels } from '@/server/services/twitch-service';

const router = Router();

router.get('/channels', async (request, response) => {
  const result = await getTwitchChannels();

  if (result instanceof Error) {
    response.status(500).json({ error: result.message });
    return;
  }

  response.json(result);
});

export { router as channelsRouter };
```

## Error Responses

Consistent error response format:

```typescript
interface ErrorResponse {
  error: string;
  details?: string;
}

// Usage
response.status(400).json({ error: 'Channel not found' });
response.status(500).json({ error: 'Failed to fetch streams', details: error.message });
```

## Database

SQLite via `bun:sqlite`. Database file stored in `data/draks-tv.db`.

Schema defined in `src/server/database/schema.ts`:

```typescript
import { Database } from 'bun:sqlite';

const db = new Database('data/draks-tv.db');

db.run(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    twitch_id TEXT UNIQUE NOT NULL,
    login TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

export { db };
```

## Environment Variables

Load via `dotenvx` or Bun's built-in env support:

```typescript
const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;
const port = process.env.PORT ?? '9442';
```

Required variables in `.env`:
- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `PORT`

## File Organization

```
src/
├── client/
│   ├── components/
│   │   ├── channel-card.tsx
│   │   ├── channel-grid.tsx
│   │   └── header.tsx
│   ├── hooks/
│   │   ├── use-channels.ts
│   │   └── use-favorites.ts
│   ├── lib/
│   │   ├── api.ts
│   │   └── format.ts
│   └── app.tsx
└── server/
    ├── routes/
    │   ├── auth.ts
    │   ├── channels.ts
    │   └── watch.ts
    ├── services/
    │   ├── twitch-service.ts
    │   └── streamlink-service.ts
    └── database/
        └── schema.ts
```
