import { useFollowedChannels } from '../hooks/use-followed-channels';
import { watchLive } from '../lib/api';
import { formatViewers, formatDate } from '../lib/format';

import { ChevronLeftIcon } from './icons';

import type { SidebarChannel } from '../lib/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SidebarChannelItemProps {
  channel: SidebarChannel;
}

function getOfflineStatusText(lastVodDate: string | null): string {
  if (lastVodDate !== null) {
    return `Last seen ${formatDate(lastVodDate)}`;
  }
  return 'Offline';
}

function categorizeChannels(channels: Array<SidebarChannel> | undefined): {
  live: Array<SidebarChannel>;
  offline: Array<SidebarChannel>;
} {
  const live: Array<SidebarChannel> = [];
  const offline: Array<SidebarChannel> = [];

  if (channels === undefined) {
    return { live, offline };
  }

  for (const channel of channels) {
    if (channel.isLive) {
      live.push(channel);
    } else {
      offline.push(channel);
    }
  }

  return { live, offline };
}

function SidebarChannelItem({ channel }: SidebarChannelItemProps) {
  async function handleClick() {
    if (channel.isLive) {
      await watchLive(channel.login);
    } else if (channel.lastVodDate !== null) {
      await watchLive(channel.login);
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#26262c]"
    >
      <div className="relative shrink-0">
        <img
          src={channel.profileImage}
          alt={channel.displayName}
          className="h-8 w-8 rounded-full"
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#18181b] ${
            channel.isLive ? 'bg-live' : 'bg-[#7a7a85]'
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[#efeff1]">
          {channel.displayName}
        </div>
        <ChannelStatusInfo channel={channel} />
      </div>
    </button>
  );
}

function ChannelStatusInfo({ channel }: SidebarChannelItemProps) {
  if (channel.isLive) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-live">{formatViewers(channel.viewerCount ?? 0)}</span>
        {channel.gameName !== null && (
          <span className="truncate text-[#adadb8]">{channel.gameName}</span>
        )}
      </div>
    );
  }

  return (
    <div className="text-xs text-[#7a7a85]">
      {getOfflineStatusText(channel.lastVodDate)}
    </div>
  );
}

function SidebarLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2f2f35] border-t-twitch-purple" />
    </div>
  );
}

interface ChannelListProps {
  channels: Array<SidebarChannel> | undefined;
}

function ChannelList({ channels }: ChannelListProps) {
  const { live: liveChannels, offline: offlineChannels } = categorizeChannels(channels);

  if (channels?.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[#7a7a85]">
        No followed channels
      </div>
    );
  }

  return (
    <>
      {liveChannels.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 px-3 text-xs font-semibold uppercase text-[#7a7a85]">
            Live ({liveChannels.length})
          </div>
          <div className="space-y-0.5">
            {liveChannels.map((channel) => (
              <SidebarChannelItem key={channel.id} channel={channel} />
            ))}
          </div>
        </div>
      )}

      {offlineChannels.length > 0 && (
        <div>
          <div className="mb-2 px-3 text-xs font-semibold uppercase text-[#7a7a85]">
            Offline ({offlineChannels.length})
          </div>
          <div className="space-y-0.5">
            {offlineChannels.map((channel) => (
              <SidebarChannelItem key={channel.id} channel={channel} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { data: channels, isLoading } = useFollowedChannels();

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
      />

      <aside className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-[#2f2f35] bg-[#18181b]">
        <div className="flex items-center justify-between border-b border-[#2f2f35] px-4 py-3">
          <h2 className="text-sm font-semibold text-[#efeff1]">Followed Channels</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#adadb8] transition-colors hover:bg-[#26262c] hover:text-[#efeff1]"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? <SidebarLoading /> : <ChannelList channels={channels} />}
        </div>
      </aside>
    </>
  );
}

export { Sidebar };
