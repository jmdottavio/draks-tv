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
- [VLC](https://www.videolan.org/) - Media player for stream playback
- [Streamlink](https://streamlink.github.io/) - CLI tool that extracts streams and pipes them to VLC
- [Twitch Developer App](https://dev.twitch.tv/console/apps) - For API access

### Installing Streamlink

Streamlink is the tool that makes one-click stream launching work. It grabs the stream URL from Twitch and opens it in VLC.

**Windows**: Download the installer from [Streamlink releases](https://github.com/streamlink/streamlink/releases) or use `winget install streamlink`

**macOS**: `brew install streamlink`

**Linux**: `sudo apt install streamlink` or equivalent for your distro

After installing, verify it works: `streamlink --version`

## Setup

If you have [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed, copy this prompt to set everything up:

```
Help me set up this draks-tv project. I need you to:
1. Check if bun, streamlink, and vlc are installed on my system
2. Run bun install
3. Walk me through creating a Twitch application at https://dev.twitch.tv/console/apps (the OAuth redirect URL should be http://localhost:9442/callback)
4. Create my .env file from .env.example and help me fill in the TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET
5. Start the dev server
```

### Manual Setup

1. Clone the repo and install dependencies:

    ```bash
    git clone https://github.com/jmdottavio/draks-tv.git
    cd draks-tv
    bun install
    ```

2. Create a Twitch application at [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps):
    - Set OAuth Redirect URL to `http://localhost:9442/callback`
    - Copy your Client ID and Client Secret

3. Configure environment:

    ```bash
    cp .env.example .env
    ```

    Add your Twitch credentials to `.env`

4. Run the app:
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

- **Framework**: TanStack Start (React 19, Vite, TanStack Router)
- **Styling**: Tailwind CSS v4
- **Database**: SQLite (via Drizzle ORM)
- **Runtime**: Bun
- **External**: Twitch Helix API, Streamlink

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

## License

MIT
