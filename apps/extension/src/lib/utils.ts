/** Relative time for highlight cards (e.g. "2h ago", "Yesterday"). */
export function formatRelativeTime(isoDate: string): string {
  const now = new Date();
  const then = new Date(isoDate);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** TODO: Tags are not persisted on highlights yet — wire when schema adds ai_tags. */
export function extractTagsFromSummary(_highlight: unknown): string[] {
  return [];
}

export function getWebAppUrl(): string {
  const origins = import.meta.env.VITE_WEB_APP_ORIGINS as string | undefined;
  const first = origins?.split(",").map((o) => o.trim()).filter(Boolean)[0];
  return first || "http://localhost:3000";
}
