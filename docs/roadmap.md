# draks-tv Roadmap

## Next Steps

### High Priority

### Medium-High Priority

### Medium Priority

- Tooltip on sidebar icons showing channel name and status
- A means of unfollowing channels from the sidebar or following or unfollowing channels from the main section.
- Browse mode - I still want a way to search/browse channels that I don't have favorited or followed.
    - This should be both a separate page and small sections on the main page (that load more lazily down below).
    - Sections on the main page should just show like 4-6 channels at a time, and a "View More" button that takes you to the separate page.
    - Make a section for the Software and Game Development category.
    - Make a section for the Everquest category.
    - Make a section for the Dota 2 category.
    - Make a section for the World of Warcraft category.
    - Make a combined section for the Pantheon, and Monsters and Memories categories.
    - Include the ability to "hide" channels from the browse mode. This should be persisted in the database.
    - Include the ability to "follow" and/or "favorite" channels from the browse mode. This should be persisted in the database and actually follow them on twitch.
- Notifications when favorites go live
    - Ideally with category/game filtering (only notify for certain games)
- Channel detail page when clicking a channel
    - Proper `/channels/:id` route with URL
    - Show latest 6 VODs with watch buttons
    - "View All VODs" link to VODs search
- Remove all explicit return types.
- API endpoints - instead of inline anonymous functions, have descriptively named functions (if possible)
- Abstract components like ones that use danger classes, buttons, etc.
- Stream uptime display - Show how long the stream has been live on cards
- Local watch history that includes total time watched
- VOD chapters/markers - Display and jump to Twitch's chapter markers when launching VODs

### Low-Medium Priority

- Search/filter channels in sidebar
- Multi-stream launcher - Open 2-4 streams simultaneously in separate VLC windows with predefined layouts
- Clips browser - Browse and launch clips for any channel, not just VODs
- Design more than just a follow and/or favorite system. I want at least 4 "ranks" of channels. Favorites being the highest rank, then followed, then just regular channels, then hidden channels.
- Drag-and-drop reordering in sidebar (currently only in main grid)
- Similar channels - Based on category overlap or Twitch's recommendation data

### Low Priority

- "Add channel" option to follow OR just add to favorites (currently only favorites)
- Loading states and error handling polish
- Audio-only mode - Streamlink flag for low-bandwidth listening while working
- Remember scroll position when returning from VODs view
- Stream quality selector before launching (always want highest anyway)
- Add a logout button.

### Future Considerations

- YouTube integration (similar favorites + VOD browsing)
- Keyboard shortcuts (refresh, navigate)
