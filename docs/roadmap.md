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
- [x] Cache followed channels "last seen" time locally
    - Don't re-fetch latest VOD for every channel on every reload
    - Update last seen time only when we see someone new go live
    - Significantly reduces API calls and load time
    - Implemented with SQLite `channel_last_seen` table
- [x] Total UI redesign
    - Larger fonts for better readability (text-base throughout)
    - Improved color contrast with semantic Tailwind tokens
    - Lighter background (#18181b instead of #0e0e10)
    - Compact horizontal layout for offline favorite cards
    - Section headers for Live Favorites, Offline Favorites, Following

## Next Steps

### High Priority

- Migrate to TanStack Start (see `docs/tanstack-start-migration.md`)
    - Replace Vite + Express with unified TanStack Start server
    - File-based routing for pages and API endpoints
    - Enables proper URL navigation and browser history
    - Reference: homeschool project structure
    - Note: NO SSR needed, client side only queries, etc.
- Fix all queries and mutations to follow patterns outlined in the `../../github/homeschool` project. Make sure to have constant query keys and/or functions to retrieve the key if parameters are needed.
- Fix all static links and be sure to use the `env` variables for the API URL. Example: "http://localhost:9442/api/auth/callback". Extract the constants to proper const SOME_URL = "http://localhost:9442/api/auth/callback"; etc
- Parallelize all possible DB / API calls.

### Medium-High Priority

- Sidebar for live and offline doesn't refresh very often / when I refocus the tab. It should refresh every 30 seconds or so. Check the react query implementation for this. Same for them section that shows live channels.
    - Be sure thumbnails refresh regularly as well.
- Order sidebar by favorites, then by last seen, then by name.
- Replace all uses of interface with types unless an interface is absolutely needed.
- Stream uptime display - Show how long the stream has been live on cards
- Add a means of integrating with twitch chat for any channel I'm watching. Not sure if this is something in VLC or what.
    - maybe this? Chatterino integration - Launch Chatterino alongside VLC pointed at the right channel

### Medium Priority

- Channel detail page when clicking a channel (after TanStack Start migration)
    - Proper `/channels/:id` route with URL
    - Show latest 5 VODs with watch buttons
    - "View All VODs" link to VODs search
- Another overall UI refresh.
    - The sidebar's header is not aligned with the page header (it's slightly smaller / higher up)
    - The sidebar has a left/right chevron but the main section has a hamburger icon and they both do the same thing
    - The favorite but offline channels is too wide, should be more of a 2 column layout at least.
    - If it is possible to show the preview image for the VODs whenever showing them
    - The live channel items (each individual channel in the live section) should be more compact. They are too tall and wide.
- Search/filter channels in sidebar
- Tooltip on collapsed icons showing channel name and status
- A means of following or unfollowing channels from the sidebar or main section.
- Browse mode - I still want a way to search/browse channels that I don't have favorited or followed.
    - This should be both a separate page and small sections on the main page (that load more lazily down below).
    - Sections on the main page should just show like 4-6 channels at a time, and a "View More" button that takes you to the separate page.
    - Make a section for the Software and Game Development category.
    - Make a section for the Everquest category.
    - Make a section for the Dota 2 category.
    - Make a combined section for the Pantheon, and Monsters and Memories categories.
    - Include the ability to "hide" channels from the browse mode. This should be persisted in the database.
    - Include the ability to "follow" and/or "favorite" channels from the browse mode. This should be persisted in the database.
- Notifications when favorites go live
    - Ideally with category/game filtering (only notify for certain games)
- Remove all explicit return types.
- API endpoints - instead of inline anonymous functions, have descriptively named functions (if possible)
- Abstract components like ones that use danger classes, buttons, etc.
- Local watch history that includes total time watched

### Low-Medium Priority

- Multi-stream launcher - Open 2-4 streams simultaneously in separate VLC windows with predefined layouts
- VOD resume tracking - Remember playback position in VODs so you can continue where you left off
- VOD chapters/markers - Display and jump to Twitch's chapter markers when launching VODs
- Clips browser - Browse and launch clips for any channel, not just VODs
- Drag-and-drop reordering in sidebar (currently only in main grid)
- Similar channels - Based on category overlap or Twitch's recommendation data
- Add a logout button.

### Low Priority

- "Add channel" option to follow OR just add to favorites (currently only favorites)
- Loading states and error handling polish
- Audio-only mode - Streamlink flag for low-bandwidth listening while working
- Remember scroll position when returning from VODs view
- Stream quality selector before launching (always want highest anyway)

### Future Considerations

- YouTube integration (similar favorites + VOD browsing)
- Keyboard shortcuts (refresh, navigate)
