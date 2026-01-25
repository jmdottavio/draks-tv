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

### High Priority
- Cache followed channels "last seen" time locally
  - Don't re-fetch latest VOD for every channel on every reload
  - Update last seen time only when we see someone new go live
  - Significantly reduces API calls and load time

### Medium-High Priority
- Total UI redesign
  - Larger fonts for better readability
  - Improved color contrast
  - Lighter background
  - Smaller/compact offline favorite cards (currently waste too much space)

### Medium Priority
- Channel detail page when clicking a channel
  - Show latest 5 VODs or navigate to VODs page with channel name pre-searched
- Search/filter channels in sidebar
- Tooltip on collapsed icons showing channel name and status
- Notifications when favorites go live
  - Ideally with category/game filtering (only notify for certain games)

### Low-Medium Priority
- Drag-and-drop reordering in sidebar (currently only in main grid)
- Local watch history

### Low Priority
- "Add channel" option to follow OR just add to favorites (currently only favorites)
- Loading states and error handling polish
- Right-click context menu for quick actions in sidebar
- Remember scroll position when returning from VODs view
- Stream quality selector before launching (always want highest anyway)

### Future Considerations
- YouTube integration (similar favorites + VOD browsing)
- Keyboard shortcuts (refresh, navigate)

## Technical Notes

### Showing Offline Followed Channels
The Twitch API doesn't directly provide "last online" time. Options:
1. Use latest VOD creation date as proxy for last stream
2. Store last-seen-live timestamps locally when refreshing
3. Accept that offline channels just show "Offline" without time info

### Port Configuration
- Frontend (Vite): 9442
- Backend (Express/Bun): 9443
