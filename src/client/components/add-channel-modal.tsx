import { useState } from 'react';

import { XMarkIcon } from './icons';

interface AddChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (login: string) => Promise<void>;
}

function AddChannelModal({ isOpen, onClose, onAdd }: AddChannelModalProps) {
  const [login, setLogin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmedLogin = login.trim();
    if (trimmedLogin === '') {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAdd(trimmedLogin);
      setLogin('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add channel');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBackdropClick(event: React.MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000]"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-[#18181b] border border-[#2f2f35] rounded-xl w-full max-w-[400px] mx-5 animate-[modalIn_0.2s_ease]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f2f35]">
          <h3 className="text-base font-semibold">Add Channel to Favorites</h3>
          <button
            onClick={onClose}
            className="text-[#7a7a85] hover:text-[#efeff1] text-2xl leading-none"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Enter channel name..."
            className="w-full px-3.5 py-2.5 border border-[#2f2f35] rounded-md bg-[#1f1f23] text-[#efeff1] text-sm focus:outline-none focus:border-twitch-purple focus:ring-[3px] focus:ring-twitch-purple/15 placeholder:text-[#7a7a85]"
            autoFocus
          />

          <button
            type="submit"
            disabled={isSubmitting || login.trim() === ''}
            className="px-4 py-2.5 rounded-md bg-twitch-purple text-white text-sm font-semibold hover:bg-twitch-purple-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add to Favorites'}
          </button>
        </form>

        {error !== null && (
          <p className="text-live text-[13px] px-5 pb-4 -mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}

export { AddChannelModal };
