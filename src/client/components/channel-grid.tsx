import { ChannelCard } from './channel-card';

import type { Channel } from '../lib/api';

interface ChannelGridProps {
  channels: Array<Channel>;
  onToggleFavorite: (id: string) => void;
}

function ChannelGrid({ channels, onToggleFavorite }: ChannelGridProps) {
  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 text-[#7a7a85]">
        <svg className="w-12 h-12 mb-4 opacity-30" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
        <p className="text-base font-medium text-[#adadb8] mb-1">No channels to show</p>
        <span className="text-sm">Add some favorites or wait for followed channels to go live</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
      {channels.map((channel) => (
        <ChannelCard
          key={channel.id}
          channel={channel}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

export { ChannelGrid };
