import { memo } from "react";

type ChannelAvatarProps = {
	channelName: string;
	profileImage: string | null;
	sizeClassName: string;
	imageClassName: string;
	fallbackClassName: string;
	wrapperClassName?: string;
	isLive?: boolean;
	showLiveIndicator?: boolean;
};

const ChannelAvatar = memo(function ChannelAvatar({
	channelName,
	profileImage,
	sizeClassName,
	imageClassName,
	fallbackClassName,
	wrapperClassName,
	isLive = false,
	showLiveIndicator = false,
}: ChannelAvatarProps) {
	let wrapperClassNameValue = "relative shrink-0";
	if (wrapperClassName) {
		wrapperClassNameValue = `${wrapperClassNameValue} ${wrapperClassName}`;
	}

	const imageClassNameValue = `${sizeClassName} ${imageClassName}`;
	const fallbackClassNameValue = `${sizeClassName} ${fallbackClassName}`;

	let avatarContent = (
		<div className={fallbackClassNameValue}>
			{channelName.charAt(0).toUpperCase()}
		</div>
	);

	if (profileImage) {
		avatarContent = (
			<img
				src={profileImage}
				alt={channelName}
				className={imageClassNameValue}
			/>
		);
	}

	return (
		<div className={wrapperClassNameValue}>
			{avatarContent}
			{showLiveIndicator && isLive && (
				<span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
					<span className="relative inline-flex h-3 w-3 rounded-full bg-live border-2 border-sidebar-bg" />
				</span>
			)}
		</div>
	);
});

export { ChannelAvatar };
