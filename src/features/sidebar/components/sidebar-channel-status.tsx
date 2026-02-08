import { memo } from "react";

import { formatDate, formatViewers } from "@/src/shared/utils/format";

import type { SidebarChannel } from "@/src/features/sidebar/sidebar.types";

function getOfflineStatusText(lastSeenAt: string | null) {
	if (lastSeenAt !== null) {
		return `Last seen ${formatDate(lastSeenAt)}`;
	}
	return "Offline";
}

const SidebarChannelStatus = memo(function SidebarChannelStatus({
	channel,
}: {
	channel: SidebarChannel;
}) {
	if (channel.isLive) {
		return (
			<div className="flex items-center gap-2 text-sm">
				<span className="font-bold text-live">
					{formatViewers(channel.viewerCount ?? 0)}
				</span>
				{channel.gameName !== null && (
					<span className="truncate text-sidebar-text-muted">{channel.gameName}</span>
				)}
			</div>
		);
	}

	return (
		<div className="text-sm text-sidebar-text-dim">
			{getOfflineStatusText(channel.lastSeenAt)}
		</div>
	);
});

export { SidebarChannelStatus };
