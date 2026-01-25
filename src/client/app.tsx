import { useState } from 'react';

import { Header } from './components/header';
import { ChannelGrid } from './components/channel-grid';
import { AddChannelModal } from './components/add-channel-modal';
import { VodsSection } from './components/vods-section';
import { AuthSection } from './components/auth-section';
import { useAuth } from './hooks/use-auth';
import { useChannels, useToggleFavorite, useAddFavorite } from './hooks/use-channels';

type View = 'channels' | 'vods';

function App() {
  const [currentView, setCurrentView] = useState<View>('channels');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: authData, isLoading: isAuthLoading } = useAuth();
  const { data: channels, isLoading: isChannelsLoading, refetch } = useChannels();
  const toggleFavoriteMutation = useToggleFavorite();
  const addFavoriteMutation = useAddFavorite();

  const [isRefreshing, setIsRefreshing] = useState(false);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center text-[#7a7a85]">
          <span>Loading</span>
          <span className="ml-3 w-6 h-6 border-2 border-[#2f2f35] border-t-twitch-purple rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (authData === undefined || !authData.authenticated) {
    return (
      <div className="min-h-screen">
        <header className="flex justify-between items-center px-6 py-4 bg-[#18181b] border-b border-[#2f2f35]">
          <h1 className="text-xl font-bold text-twitch-purple tracking-tight">draks-tv</h1>
        </header>
        <main className="p-6 max-w-[1600px] mx-auto">
          <AuthSection />
        </main>
      </div>
    );
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }

  function handleToggleFavorite(id: string) {
    toggleFavoriteMutation.mutate(id);
  }

  async function handleAddFavorite(login: string) {
    await addFavoriteMutation.mutateAsync(login);
  }

  return (
    <div className="min-h-screen">
      <Header
        onAddChannel={() => setIsModalOpen(true)}
        onShowVods={() => setCurrentView('vods')}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="p-6 max-w-[1600px] mx-auto">
        {currentView === 'channels' && (
          <section className="animate-[fadeIn_0.2s_ease]">
            {isChannelsLoading && (
              <div className="flex items-center justify-center py-16 text-[#7a7a85]">
                <span>Loading channels</span>
                <span className="ml-3 w-6 h-6 border-2 border-[#2f2f35] border-t-twitch-purple rounded-full animate-spin" />
              </div>
            )}

            {!isChannelsLoading && channels !== undefined && (
              <ChannelGrid channels={channels} onToggleFavorite={handleToggleFavorite} />
            )}
          </section>
        )}

        {currentView === 'vods' && (
          <VodsSection onBack={() => setCurrentView('channels')} />
        )}
      </main>

      <AddChannelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddFavorite}
      />
    </div>
  );
}

export { App };
