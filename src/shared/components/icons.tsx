type IconProps = {
	className?: string;
};

function PlusIcon({ className }: IconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<line x1="12" y1="5" x2="12" y2="19" />
			<line x1="5" y1="12" x2="19" y2="12" />
		</svg>
	);
}

function FilmIcon({ className }: IconProps) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="currentColor">
			<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z" />
		</svg>
	);
}

function ArrowPathIcon({ className }: IconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M23 4v6h-6M1 20v-6h6" />
			<path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
		</svg>
	);
}

function ArrowLeftIcon({ className }: IconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M19 12H5M12 19l-7-7 7-7" />
		</svg>
	);
}

function SearchIcon({ className }: IconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
	);
}

function StarIcon({ className, filled }: IconProps & { filled?: boolean }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill={filled ? "currentColor" : "none"}
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
		</svg>
	);
}

function TwitchIcon({ className }: IconProps) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="currentColor">
			<path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
		</svg>
	);
}

function XMarkIcon({ className }: IconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M18 6L6 18M6 6l12 12" />
		</svg>
	);
}

function ChevronLeftIcon({ className }: IconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M15 18l-6-6 6-6" />
		</svg>
	);
}

function ChevronRightIcon({ className }: IconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M9 18l6-6-6-6" />
		</svg>
	);
}

function MenuIcon({ className }: IconProps) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M3 12h18M3 6h18M3 18h18" />
		</svg>
	);
}

function ChatIcon({ className, filled }: IconProps & { filled?: boolean }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill={filled ? "currentColor" : "none"}
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
		</svg>
	);
}

function GripIcon({ className }: IconProps) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="currentColor">
			<circle cx="8" cy="6" r="2" />
			<circle cx="16" cy="6" r="2" />
			<circle cx="8" cy="12" r="2" />
			<circle cx="16" cy="12" r="2" />
			<circle cx="8" cy="18" r="2" />
			<circle cx="16" cy="18" r="2" />
		</svg>
	);
}

export {
	PlusIcon,
	FilmIcon,
	ArrowPathIcon,
	ArrowLeftIcon,
	SearchIcon,
	StarIcon,
	TwitchIcon,
	XMarkIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	MenuIcon,
	ChatIcon,
	GripIcon,
};
