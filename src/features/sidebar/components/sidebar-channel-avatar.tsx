import { memo } from "react";

import { ChannelAvatar } from "@/src/features/channels/components/channel-avatar";

import type { SidebarChannel } from "@/src/features/sidebar/sidebar.types";

type SidebarChannelAvatarProps = {
	channel: SidebarChannel;
	isExpanded: boolean;
};

const SidebarChannelAvatar = memo(function SidebarChannelAvatar({
	channel,
	isExpanded,
}: SidebarChannelAvatarProps) {
	let ringColor = "ring-sidebar-text-dim";
	if (channel.isLive) {
		ringColor = "ring-live";
	}

	let glowClass = "";
	if (channel.isLive) {
		glowClass = "shadow-[0_0_8px_rgba(255,68,68,0.5)]";
	}

	let sizeClassName = "h-8 w-8";
	if (isExpanded) {
		sizeClassName = "h-9 w-9";
	}

	const imageClassName = `rounded-full ring-2 ${ringColor} ${glowClass} transition-all duration-200`;
	const fallbackClassName = `${imageClassName} bg-sidebar-hover flex items-center justify-center text-sidebar-text-muted text-xs font-semibold`;

	return (
		<ChannelAvatar
			channelName={channel.channelName}
			profileImage={channel.profileImage}
			sizeClassName={sizeClassName}
			imageClassName={imageClassName}
			fallbackClassName={fallbackClassName}
			wrapperClassName="group/avatar"
			isLive={channel.isLive}
			showLiveIndicator={true}
		/>
	);
});

export { SidebarChannelAvatar };
