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
draks-tv/
├── src/
│   ├── client/          # React frontend (Vite)
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom hooks (TanStack Query)
│   │   └── lib/         # Utilities
│   └── server/          # Express backend
│       ├── routes/      # API route handlers
│       ├── services/    # Business logic (Twitch API, Streamlink)
│       └── database/    # SQLite schema and queries
├── knowledge/           # Coding standards and patterns
├── public/              # Static assets (if any)
├── docs/                # Project documentation and roadmap
└── data/                # SQLite database file
```

## Key Features

- OAuth with Twitch for followed channels
- Combined view: favorites + followed channels
- Collapsible sidebar with all followed channels (icons-only when collapsed)
- Live status indicators with red ring/glow effects
- Latest VOD for offline channels
- One-click launch to VLC via Streamlink
- Favorites stored in SQLite (toggle from sidebar or main grid)

## Tech Stack

- **Frontend**: React + Vite + TanStack Query + Tailwind CSS
- **Backend**: Express.js + Bun
- **Database**: SQLite (bun:sqlite)
- **External**: Twitch Helix API, Streamlink

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
