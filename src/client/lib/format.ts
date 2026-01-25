function formatViewers(count: number): string {
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(1) + 'M';
  }

  if (count >= 1_000) {
    return (count / 1_000).toFixed(1) + 'K';
  }

  return count.toString();
}

function formatDuration(duration: string): string {
  const match = duration.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);

  if (match === null) {
    return duration;
  }

  const hours = match[1] ?? '0';
  const minutes = match[2] ?? '0';

  if (Number(hours) > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;

  return date.toLocaleDateString();
}

function formatThumbnail(url: string, width: number, height: number): string {
  return url
    .replace('{width}', width.toString())
    .replace('{height}', height.toString())
    .replace('%{width}', width.toString())
    .replace('%{height}', height.toString());
}

export { formatViewers, formatDuration, formatDate, formatThumbnail };
