import { useState } from 'react';

import { ArrowLeftIcon, SearchIcon } from './icons';
import { useVodSearch } from '../hooks/use-vods';
import { formatDuration, formatDate, formatThumbnail } from '../lib/format';
import { watchVod } from '../lib/api';

import type { TwitchVideo } from '../lib/api';

interface VodsSectionProps {
  onBack: () => void;
}

function VodsSection({ onBack }: VodsSectionProps) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState<string | null>(null);

  const { data, isLoading, error } = useVodSearch(searchQuery);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = searchInput.trim();

    if (trimmed !== '') {
      setSearchQuery(trimmed);
    }
  }

  function handleWatchVod(vodId: string) {
    watchVod(vodId);
  }

  return (
    <section className="animate-[fadeIn_0.2s_ease]">
      <div className="flex items-center gap-4 mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md text-text-muted text-sm font-semibold hover:bg-surface-elevated hover:text-text-primary transition-all"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-xl font-semibold">Search VODs</h2>
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-3 mb-6 px-4 py-1 bg-surface-card border border-surface-border-muted rounded-lg max-w-[600px]">
        <SearchIcon className="w-5 h-5 text-text-dim flex-shrink-0" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Enter channel name..."
          className="flex-1 py-2.5 bg-transparent border-none text-text-primary text-sm focus:outline-none placeholder:text-text-dim"
          autoFocus
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-md bg-twitch-purple text-white text-sm font-semibold hover:bg-twitch-purple-hover transition-all flex-shrink-0"
        >
          Search
        </button>
      </form>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-text-dim">
          <span>Searching</span>
          <span className="ml-3 w-6 h-6 border-2 border-surface-border-muted border-t-twitch-purple rounded-full animate-spin" />
        </div>
      )}

      {error !== null && (
        <p className="text-live text-sm">{error.message}</p>
      )}

      {data !== null && data !== undefined && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {data.videos.map((vod) => (
            <VodCard key={vod.id} vod={vod} onWatch={handleWatchVod} />
          ))}
        </div>
      )}

      {data !== null && data !== undefined && data.videos.length === 0 && (
        <p className="text-text-dim text-sm">No VODs found for {searchQuery}</p>
      )}
    </section>
  );
}

interface VodCardProps {
  vod: TwitchVideo;
  onWatch: (id: string) => void;
}

function VodCard({ vod, onWatch }: VodCardProps) {
  const thumbnailUrl = formatThumbnail(vod.thumbnail_url, 440, 248);

  return (
    <div className="bg-surface-card border border-surface-border-muted rounded-lg overflow-hidden transition-all hover:-translate-y-0.5 hover:border-surface-border">
      <div className="relative aspect-video bg-surface-elevated">
        <img
          src={thumbnailUrl}
          alt={vod.title}
          className="w-full h-full object-cover"
        />
        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-sm font-medium px-2 py-1 rounded">
          {formatDuration(vod.duration)}
        </span>
      </div>

      <div className="p-4">
        <div className="text-sm text-text-primary mb-2 line-clamp-2" title={vod.title}>
          {vod.title}
        </div>
        <div className="flex items-center gap-3 text-sm text-text-muted mb-4">
          <span className="text-twitch-purple-light font-semibold">{vod.user_name}</span>
          <span>{formatDate(vod.created_at)}</span>
        </div>
        <button
          onClick={() => onWatch(vod.id)}
          className="w-full py-2.5 px-4 rounded-md bg-surface-elevated border border-surface-border-muted text-text-primary text-sm font-semibold hover:bg-twitch-purple hover:border-twitch-purple transition-all"
        >
          Watch in VLC
        </button>
      </div>
    </div>
  );
}

export { VodsSection };
