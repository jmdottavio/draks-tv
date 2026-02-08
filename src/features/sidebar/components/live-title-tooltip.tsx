import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { SidebarChannel } from "@/src/features/sidebar/sidebar.types";

type LiveTitleTooltipProps = {
	channel: SidebarChannel;
	tooltipId: string | undefined;
	className?: string;
	children: React.ReactNode;
};

type TooltipPosition = {
	left: number;
	top: number;
};

function getTooltipTitleText(channel: SidebarChannel) {
	if (!channel.isLive) {
		return null;
	}

	if (channel.streamTitle === null) {
		return null;
	}

	const trimmedStreamTitle = channel.streamTitle.trim();
	if (trimmedStreamTitle.length === 0) {
		return null;
	}

	return trimmedStreamTitle;
}

function getTooltipPosition(rect: DOMRect): TooltipPosition {
	const horizontalOffset = 12;

	return {
		left: rect.right + horizontalOffset,
		top: rect.top + rect.height / 2,
	};
}

function getTooltipId(channel: SidebarChannel) {
	return `sidebar-tooltip-${channel.id}`;
}

export function getLiveTitleTooltipId(channel: SidebarChannel): string | undefined {
	const tooltipTitleText = getTooltipTitleText(channel);
	if (tooltipTitleText === null) {
		return undefined;
	}

	return getTooltipId(channel);
}

export function LiveTitleTooltip({
	channel,
	tooltipId,
	className,
	children,
}: LiveTitleTooltipProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
	const tooltipTitleText = getTooltipTitleText(channel);
	const shouldShowTooltip = tooltipTitleText !== null;
	let tooltipElementId = getTooltipId(channel);
	if (tooltipId !== undefined) {
		tooltipElementId = tooltipId;
	}

	const handleTooltipShow = useCallback(() => {
		if (!shouldShowTooltip) {
			return;
		}

		const triggerRect = containerRef.current?.getBoundingClientRect();
		if (!triggerRect) {
			return;
		}

		setTooltipPosition(getTooltipPosition(triggerRect));
	}, [shouldShowTooltip]);

	const handleTooltipHide = useCallback(() => {
		setTooltipPosition(null);
	}, []);

	let wrapperClassName = "group relative";
	if (className) {
		wrapperClassName = `${wrapperClassName} ${className}`;
	}

	let tooltipNode: React.ReactNode = null;

	if (shouldShowTooltip && tooltipPosition !== null && typeof document !== "undefined") {
		const tooltipStyle = {
			left: tooltipPosition.left,
			top: tooltipPosition.top,
		};

		tooltipNode = createPortal(
			<div
				id={tooltipElementId}
				role="tooltip"
				style={tooltipStyle}
				className="pointer-events-none fixed z-[100] w-max max-w-[420px] -translate-y-1/2"
			>
				<div className="rounded-lg border border-surface-border-muted bg-surface-elevated px-4 py-2.5 shadow-lg">
					<div className="tooltip-clamp text-sm font-semibold text-sidebar-text">
						{tooltipTitleText}
					</div>
				</div>
			</div>,
			document.body,
		);
	}

	return (
		<div
			ref={containerRef}
			onMouseEnter={handleTooltipShow}
			onMouseLeave={handleTooltipHide}
			onFocus={handleTooltipShow}
			onBlur={handleTooltipHide}
			className={wrapperClassName}
		>
			{children}
			{tooltipNode}
		</div>
	);
}
