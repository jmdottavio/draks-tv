# draks-tv

A lightweight local web app for viewing Twitch followed channels and launching streams via Streamlink/VLC.

## Quick Start

```bash
bun install
bun run dev
```

App runs at http://localhost:9442

## Project Structure

```
src/
├── app/              # Application routes & API
│   ├── api/          # Backend API endpoints
│   └── ...           # Frontend route components
├── db/               # Database layer
│   ├── repositories/ # Data access repositories
│   └── schema.ts     # Drizzle schema definitions
├── services/         # Domain services
│   ├── streamlink-service.ts
│   └── twitch-service.ts
└── shared/           # Shared resources
    ├── components/   # Reusable UI components
    ├── context/      # React contexts
    ├── hooks/        # Custom hooks
    ├── lib/          # Core libraries
    └── utils/        # Helper functions
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
