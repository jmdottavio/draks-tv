import { memo, useCallback } from "react";

import { StarIcon } from "@/src/shared/components/icons";

type FavoriteToggleButtonProps = {
	channelId: string;
	isFavorite: boolean;
	onToggle: (id: string) => void;
};

function getFavoriteButtonConfig(isFavorite: boolean) {
	let title = "Add to favorites";
	let toneClassName = "text-sidebar-text-dim hover:text-favorite hover:bg-sidebar-hover";
	let opacityClassName = "opacity-0 group-hover:opacity-100";

	if (isFavorite) {
		title = "Remove from favorites";
		toneClassName = "text-favorite hover:text-favorite-hover";
		opacityClassName = "opacity-100";
	}

	return {
		title,
		toneClassName,
		opacityClassName,
	};
}

const FavoriteToggleButton = memo(function FavoriteToggleButton({
	channelId,
	isFavorite,
	onToggle,
}: FavoriteToggleButtonProps) {
	const handleFavoriteClick = useCallback(
		(event: React.MouseEvent) => {
			event.stopPropagation();
			onToggle(channelId);
		},
		[channelId, onToggle],
	);

	const favoriteButtonConfig = getFavoriteButtonConfig(isFavorite);
	const favoriteClassName = `shrink-0 p-1.5 rounded-md transition-all duration-200 cursor-pointer ${favoriteButtonConfig.opacityClassName} ${favoriteButtonConfig.toneClassName}`;

	return (
		<button
			onClick={handleFavoriteClick}
			aria-label={favoriteButtonConfig.title}
			aria-pressed={isFavorite}
			className={favoriteClassName}
			title={favoriteButtonConfig.title}
		>
			<StarIcon className="h-5 w-5" filled={isFavorite} />
		</button>
	);
});

export { FavoriteToggleButton };
