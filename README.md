# draks-tv

A local web app for browsing Twitch followed channels and launching streams directly to VLC via Streamlink.

## Features

- **Twitch OAuth** - Log in to see your followed channels
- **Favorites** - Pin channels to the top, drag-and-drop to reorder
- **Live/Offline status** - See who's live with viewer counts and game info
- **One-click launch** - Opens streams in VLC via Streamlink
- **VOD browsing** - Search and watch past broadcasts
- **Sidebar** - Quick access to all followed channels

## Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Streamlink](https://streamlink.github.io/) - Extracts streams for playback
- [VLC](https://www.videolan.org/) - Media player (Streamlink's default)
- [Twitch Developer App](https://dev.twitch.tv/console/apps) - For API access

## Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/draks-tv.git
   cd draks-tv
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Create a Twitch application**
   - Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
   - Create a new application
   - Set OAuth Redirect URL to `http://localhost:9442/callback`
   - Note your Client ID and Client Secret

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Twitch credentials:
   ```
   TWITCH_CLIENT_ID=your_client_id
   TWITCH_CLIENT_SECRET=your_client_secret
   ```

5. **Run the app**
   ```bash
   bun run dev
   ```
   Open http://localhost:9442

## Usage

1. Click "Login with Twitch" to authenticate
2. Your followed channels appear in the sidebar and main grid
3. Click a live channel to launch the stream in VLC
4. Star channels to add them to favorites
5. Drag favorites to reorder them
6. Use the VODs section to search past broadcasts

## Tech Stack

- **Frontend**: React, Vite, TanStack Query, Tailwind CSS
- **Backend**: Express.js, Bun
- **Database**: SQLite (stores favorites and auth tokens locally)
- **External**: Twitch Helix API, Streamlink

## Project Structure

```
src/
├── client/           # React frontend
│   ├── components/   # UI components
│   ├── hooks/        # TanStack Query hooks
│   └── lib/          # API client and utilities
└── server/           # Express backend
    ├── routes/       # API endpoints
    ├── services/     # Twitch API, Streamlink integration
    └── database/     # SQLite queries
```

## License

MIT
