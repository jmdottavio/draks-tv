import { Link } from "@tanstack/react-router";
import { memo } from "react";

import { ArrowPathIcon, FilmIcon, MenuIcon } from "./icons";

type HeaderProps = {
	onRefresh: () => void;
	onToggleSidebar: () => void;
	isRefreshing: boolean;
};

const Header = memo(function Header({ onRefresh, onToggleSidebar, isRefreshing }: HeaderProps) {
	return (
		<header className="flex justify-between items-center px-6 py-4 bg-surface-card border-b border-surface-border sticky top-0 z-50">
			<div className="flex items-center gap-3">
				<button
					onClick={onToggleSidebar}
					className="p-2.5 rounded-md text-text-muted hover:bg-surface-elevated hover:text-text-primary transition-all"
					title="Toggle followed channels"
				>
					<MenuIcon className="w-5 h-5" />
				</button>
				<h1 className="m-0 text-xl font-bold tracking-tight">
					<Link to="/" className="text-twitch-purple">
						draks-tv
					</Link>
				</h1>
			</div>

			<div className="flex items-center gap-3">
				<Link
					to="/vods"
					className="flex items-center gap-2 px-4 py-2.5 rounded-md text-text-muted text-sm font-semibold hover:bg-surface-elevated hover:text-text-primary transition-all"
				>
					<FilmIcon className="w-4 h-4" />
					VODs
				</Link>

				<button
					onClick={onRefresh}
					disabled={isRefreshing}
					className="p-2.5 rounded-md text-text-muted hover:bg-surface-elevated hover:text-text-primary transition-all disabled:opacity-50"
					title="Refresh"
				>
					<ArrowPathIcon className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
				</button>
			</div>
		</header>
	);
});

export { Header };
