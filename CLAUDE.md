# draks-tv

A lightweight local web app for viewing Twitch followed channels and launching streams via Streamlink/VLC.

## Quick Start

```bash
bun install
bun run dev
```

App runs at http://localhost:9442

## Architecture

- **Frontend**: TanStack Start (SSR/Client)
- **Backend API**: `src/app/api`
- **Data Flow**: API Route -> Service -> Repository -> Drizzle/SQLite
- **State**: TanStack Query for server state

## Project Structure

```
src/
├── app/                    # TanStack Start routes & API
│   ├── api/                # Backend API endpoints
│   └── ...                 # Frontend route components
├── features/               # Feature-based modules
│   ├── auth/               # Authentication
│   │   ├── api/            # Auth queries
│   │   ├── components/     # Auth UI
│   │   ├── hooks/          # useAuth
│   │   ├── auth.repository.ts
│   │   ├── auth.types.ts
│   │   └── index.ts
│   ├── channels/           # Channels & Favorites
│   │   ├── api/            # Queries & mutations
│   │   ├── components/     # ChannelCard, ChannelGrid
│   │   ├── hooks/          # useChannels
│   │   ├── favorites.repository.ts
│   │   ├── channels.types.ts
│   │   ├── channels.validators.ts
│   │   └── index.ts
│   ├── sidebar/            # Sidebar navigation
│   │   ├── api/            # Sidebar queries
│   │   ├── components/     # Sidebar
│   │   ├── hooks/          # useFollowedChannels
│   │   ├── channel-last-seen.repository.ts
│   │   ├── sidebar.types.ts
│   │   └── index.ts
│   └── vods/               # VOD browsing
│       ├── api/            # VOD queries & mutations
│       ├── hooks/          # useVodSearch
│       ├── vods.types.ts
│       └── index.ts
├── services/               # External integrations
│   ├── streamlink-service.ts
│   └── twitch-service.ts
├── db/                     # Database layer
│   ├── schema.ts           # Drizzle schema definitions
│   └── index.ts            # Database instance
└── shared/                 # Cross-cutting utilities
    ├── components/         # header, icons
    ├── context/            # layout-context
    └── utils/              # api-errors, format, parse-request-body
```

## Key Features

- OAuth with Twitch for followed channels
- Combined view: favorites + followed channels
- Drag-and-drop reordering for favorites (order persisted in SQLite)
- Collapsible sidebar with all followed channels (icons-only when collapsed)
- Live status indicators with red ring/glow effects
- Latest VOD for offline channels
- One-click launch to VLC via Streamlink
- Favorites stored in SQLite (toggle from sidebar or main grid)

## Knowledge Files

Read all files in `knowledge/` for coding standards:

- `CODE-STANDARDS.md` - General patterns
- `PROJECT.md` - Project-specific conventions
- `REACT.md` - React patterns
- `TYPESCRIPT.md` - TypeScript standards

## Environment Variables

Required in `.env`:

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `PORT` (default: 9442)
