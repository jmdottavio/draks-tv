import { StarIcon } from './icons';
import { formatViewers, formatDuration, formatDate, formatThumbnail } from '../lib/format';
import { watchLive, watchVod } from '../lib/api';

import type { Channel } from '../lib/api';

interface ChannelCardProps {
  channel: Channel;
  onToggleFavorite: (id: string) => void;
}

function ChannelCard({ channel, onToggleFavorite }: ChannelCardProps) {
  function handleWatchClick() {
    if (channel.isLive) {
      watchLive(channel.login);
      return;
    }

    if (channel.latestVod !== null) {
      watchVod(channel.latestVod.id);
    }
  }

  function handleFavoriteClick(event: React.MouseEvent) {
    event.stopPropagation();
    onToggleFavorite(channel.id);
  }

  const thumbnailUrl = getThumbnailUrl(channel);
  const hasContent = channel.isLive || channel.latestVod !== null;

  return (
    <div
      className={`bg-[#18181b] border rounded-lg overflow-hidden transition-all hover:-translate-y-0.5 ${
        channel.isLive ? 'border-live' : 'border-[#2f2f35] hover:border-[#7a7a85]'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#1f1f23]">
        {thumbnailUrl !== null && (
          <img
            src={thumbnailUrl}
            alt={channel.displayName}
            className="w-full h-full object-cover"
          />
        )}

        {channel.isLive && (
          <span className="absolute top-2.5 left-2.5 bg-live text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase">
            Live
          </span>
        )}

        {!channel.isLive && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-black/70 text-[#adadb8] text-xs font-semibold px-2.5 py-1 rounded uppercase">
              {channel.latestVod !== null ? 'Offline' : 'Offline - No VODs'}
            </span>
          </div>
        )}

        {channel.latestVod !== null && !channel.isLive && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
            {formatDuration(channel.latestVod.duration)}
          </span>
        )}

        <button
          onClick={handleFavoriteClick}
          className={`absolute top-2.5 right-2.5 bg-black/60 p-2 rounded-full transition-all hover:bg-black/80 hover:scale-110 ${
            channel.isFavorite ? 'text-favorite' : 'text-[#7a7a85]'
          }`}
          title={channel.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <StarIcon className="w-[18px] h-[18px]" filled={channel.isFavorite} />
        </button>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-center gap-2.5 mb-2.5">
          <img
            src={channel.profileImage}
            alt={channel.displayName}
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
          />
          <span className="font-semibold text-sm text-twitch-purple-light truncate">
            {channel.displayName}
          </span>
        </div>

        {channel.isLive && channel.stream !== null && (
          <>
            <div className="text-[13px] text-[#efeff1] mb-1.5 line-clamp-2" title={channel.stream.title}>
              {channel.stream.title}
            </div>
            <div className="flex items-center gap-3 text-xs text-[#adadb8] mb-3">
              <span>{channel.stream.gameName}</span>
              <span className="text-live font-medium">{formatViewers(channel.stream.viewerCount)} viewers</span>
            </div>
          </>
        )}

        {!channel.isLive && channel.latestVod !== null && (
          <>
            <div className="text-[13px] text-[#efeff1] mb-1.5 line-clamp-2" title={channel.latestVod.title}>
              {channel.latestVod.title}
            </div>
            <div className="flex items-center gap-3 text-xs text-[#adadb8] mb-3">
              <span className="text-[#7a7a85]">{formatDuration(channel.latestVod.duration)}</span>
              <span>{formatDate(channel.latestVod.createdAt)}</span>
            </div>
          </>
        )}

        {hasContent && (
          <button
            onClick={handleWatchClick}
            className="w-full py-2 px-3 rounded-md bg-[#1f1f23] border border-[#2f2f35] text-[#efeff1] text-[13px] font-semibold hover:bg-twitch-purple hover:border-twitch-purple transition-all"
          >
            {channel.isLive ? 'Watch Live' : 'Watch VOD'}
          </button>
        )}
      </div>
    </div>
  );
}

function getThumbnailUrl(channel: Channel): string | null {
  if (channel.isLive && channel.stream !== null) {
    return formatThumbnail(channel.stream.thumbnailUrl, 440, 248);
  }

  if (channel.latestVod !== null) {
    return formatThumbnail(channel.latestVod.thumbnailUrl, 440, 248);
  }

  return null;
}

export { ChannelCard };
