import { PlusIcon, FilmIcon, ArrowPathIcon } from './icons';

interface HeaderProps {
  onAddChannel: () => void;
  onShowVods: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function Header({ onAddChannel, onShowVods, onRefresh, isRefreshing }: HeaderProps) {
  return (
    <header className="flex justify-between items-center px-6 py-4 bg-[#18181b] border-b border-[#2f2f35] sticky top-0 z-50">
      <h1 className="text-xl font-bold text-twitch-purple tracking-tight">draks-tv</h1>

      <div className="flex items-center gap-3">
        <button
          onClick={onAddChannel}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#1f1f23] border border-[#2f2f35] text-[#efeff1] text-sm font-semibold hover:bg-[#26262c] hover:border-[#7a7a85] transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          Add Channel
        </button>

        <button
          onClick={onShowVods}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md text-[#adadb8] text-sm font-semibold hover:bg-[#26262c] hover:text-[#efeff1] transition-all"
        >
          <FilmIcon className="w-4 h-4" />
          VODs
        </button>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2.5 rounded-md text-[#adadb8] hover:bg-[#26262c] hover:text-[#efeff1] transition-all disabled:opacity-50"
          title="Refresh"
        >
          <ArrowPathIcon className={`w-[18px] h-[18px] ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
}

export { Header };
