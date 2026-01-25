import { useState, useRef } from 'react';

import { ChannelCard } from './channel-card';

import type { Channel } from '../lib/api';

interface ChannelGridProps {
  channels: Array<Channel>;
  onToggleFavorite: (id: string) => void;
  onReorderFavorites: (orderedIds: Array<string>) => void;
}

function ChannelGrid({ channels, onToggleFavorite, onReorderFavorites }: ChannelGridProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragCounter = useRef(0);

  const favoriteChannels: Array<Channel> = [];
  const nonFavoriteChannels: Array<Channel> = [];

  for (const channel of channels) {
    if (channel.isFavorite) {
      favoriteChannels.push(channel);
    } else {
      nonFavoriteChannels.push(channel);
    }
  }

  function handleDragStart(event: React.DragEvent, channelId: string) {
    setDraggedId(channelId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', channelId);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
    dragCounter.current = 0;
  }

  function handleDragEnter(event: React.DragEvent, channelId: string) {
    event.preventDefault();
    dragCounter.current++;

    if (channelId !== draggedId) {
      setDragOverId(channelId);
    }
  }

  function handleDragLeave() {
    dragCounter.current--;

    if (dragCounter.current === 0) {
      setDragOverId(null);
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(event: React.DragEvent, targetId: string) {
    event.preventDefault();
    dragCounter.current = 0;

    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const currentOrder = favoriteChannels.map((channel) => channel.id);
    const draggedIndex = currentOrder.indexOf(draggedId);
    const targetIndex = currentOrder.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedId);

    onReorderFavorites(newOrder);

    setDraggedId(null);
    setDragOverId(null);
  }

  function getDragClassName(channelId: string) {
    const isDragging = draggedId === channelId;
    const isDropTarget = dragOverId === channelId && draggedId !== channelId;

    let className = 'cursor-grab active:cursor-grabbing transition-all duration-150';

    if (isDragging) {
      className += ' opacity-50 scale-95';
    }

    if (isDropTarget) {
      className += ' ring-2 ring-twitch-purple ring-offset-2 ring-offset-[#0e0e10]';
    }

    return className;
  }

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
      {favoriteChannels.map((channel) => (
        <div
          key={channel.id}
          draggable
          onDragStart={(event) => handleDragStart(event, channel.id)}
          onDragEnd={handleDragEnd}
          onDragEnter={(event) => handleDragEnter(event, channel.id)}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={(event) => handleDrop(event, channel.id)}
          className={getDragClassName(channel.id)}
        >
          <ChannelCard
            channel={channel}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
      ))}
      {nonFavoriteChannels.map((channel) => (
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
