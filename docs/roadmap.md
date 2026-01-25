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

## Next Steps

### Sidebar for All Followed Channels
- Add collapsible sidebar showing all followed channels (not just live)
- User can organize/reorder channels in sidebar
- Shows online/offline status indicator
- "Last online" approximated via latest VOD date (no direct Twitch API for this)
- Note: Requires additional API calls to fetch all followed users, not just live streams

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
