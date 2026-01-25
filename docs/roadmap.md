# draks-tv Roadmap

## Completed

- [x] Basic Twitch OAuth integration
- [x] Show followed live streams
- [x] VOD search by channel name
- [x] One-click launch to VLC via Streamlink
- [x] Favorites system with star toggle on cards
- [x] Combined view: favorites (live/offline) + followed live streams
- [x] Latest VOD shown for offline favorites
- [x] Migrate to React + Vite + TanStack Query + Tailwind
- [x] Switch to Bun package manager
- [x] SQLite database for favorites and auth tokens
- [x] Set up coding standards (CLAUDE.md + knowledge/)
- [x] Remove legacy pre-migration files (public/app.js, server.js, etc.)
- [x] Sidebar for all followed channels with live/offline status
  - Collapsible sidebar with toggle in header
  - Shows all followed channels (not just live)
  - Live channels show viewer count and game
  - Offline channels show "Last seen X ago" via VOD date
  - State persisted to localStorage
- [x] Sidebar improvements
  - Collapsed mode shows icons with red/gray ring indicators for live/offline
  - Expanded mode has favorite toggle star button
  - Larger fonts, brighter live color (#ff4444) for better readability
  - Custom ghost scrollbar that appears on hover
  - Parallelized VOD fetches for faster loading
- [x] Drag-and-drop reordering for favorites
  - Drag favorites in main grid to reorder
  - Order persisted in SQLite via sort_order column
  - Optimistic UI updates with rollback on error

## Next Steps

### Sidebar Enhancements
- Drag-and-drop reordering in sidebar (currently only in main grid)
- Search/filter channels in sidebar
- Right-click context menu for quick actions
- Tooltip on collapsed icons showing channel name and status

### UI/UX Improvements
- Loading states and error handling polish
- Keyboard shortcuts (refresh, navigate)
- Remember scroll position when returning from VODs view

### Future Considerations
- YouTube integration (similar favorites + VOD browsing)
- Local watch history
- Stream quality selector before launching
- Notifications when favorites go live (optional)

## Technical Notes

### Showing Offline Followed Channels
The Twitch API doesn't directly provide "last online" time. Options:
1. Use latest VOD creation date as proxy for last stream
2. Store last-seen-live timestamps locally when refreshing
3. Accept that offline channels just show "Offline" without time info

### Port Configuration
- Frontend (Vite): 9442
- Backend (Express/Bun): 9443
