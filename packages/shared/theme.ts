/**
 * Swearch design-system class strings — light mode.
 * Shared between apps/extension and apps/web.
 * Values map to tokens in each app's tailwind.config.ts.
 */

/** Indigo accent badge — active project indicator, type labels. */
export const PROJECT_BADGE =
  "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent-50 text-accent border border-accent-200 text-xs font-medium";

/** Outer container — page sections, modal shells. */
export const CONTAINER_OUTER =
  "bg-surface-0 border border-border-default rounded-xl shadow-tier-1";

/** Nested card — default elevation for list items and highlight rows. */
export const CONTAINER_NESTED =
  "bg-surface-1 border border-border-subtle rounded-lg shadow-tier-2 p-3";

/** Elevation aliases */
export const TIER_2 = CONTAINER_NESTED;
export const CARD = TIER_2;

/** Accent callout — relevance insight block. */
export const TIER_3 =
  "bg-accent-50 border border-accent-200 rounded-lg shadow-tier-3 p-3";

/** Success callout. */
export const TIER_3_SUCCESS =
  "bg-success-50 border border-success-200 rounded-lg shadow-tier-success p-3";

/** Buttons */
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover active:bg-accent-muted text-white px-4 py-2.5 rounded-md text-sm font-medium shadow-btn-primary transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:opacity-60 disabled:cursor-not-allowed";

export const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-2 bg-transparent border border-border-default text-text-primary hover:bg-surface-1 px-3 py-2.5 rounded-md text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:opacity-60 disabled:cursor-not-allowed";

export const BTN_DESTRUCTIVE =
  "inline-flex items-center justify-center gap-2 bg-transparent border border-error/50 text-error hover:bg-error-50 px-3 py-2.5 rounded-md text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-error/40 disabled:opacity-60 disabled:cursor-not-allowed";

export const BTN_SUCCESS =
  "inline-flex items-center justify-center gap-2 bg-success hover:opacity-90 text-white px-4 py-2.5 rounded-md text-sm font-medium shadow-tier-success transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-success/60 disabled:opacity-60 disabled:cursor-not-allowed";

/** Form inputs */
export const INPUT_FIELD =
  "bg-surface-1 border border-border-subtle rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-50 transition-colors duration-150 disabled:opacity-60";

/** Quote display — italic, left-border. */
export const QUOTE_BLOCK =
  "text-sm text-text-secondary italic leading-relaxed border-l-2 border-border-default pl-3";

/** Inline feedback */
export const SPINNER =
  "w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0";

export const ERROR_TEXT = "text-xs text-error flex items-start gap-2";

export const SUCCESS_TEXT = "text-xs text-success flex items-center gap-2";

export const TRUNCATION_BANNER =
  "text-xs text-warning bg-amber-50 border border-amber-200 rounded px-2 py-1.5";

/** Analysis section layout */
export const SECTION_LABEL =
  "flex items-center gap-2 text-xs font-medium text-text-secondary mb-1.5";

export const SECTION_CONTENT =
  "text-sm text-text-primary leading-relaxed whitespace-pre-wrap";

/** Tag pill — AI-derived tags, type chips. */
export const TAG_PILL =
  "inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-2 text-text-secondary text-xs border border-border-subtle";

/** Tab bar (pill toggle) */
export const TABS_LIST =
  "grid w-full flex-shrink-0 bg-surface-1 rounded-full p-0.5 gap-0.5";

export const TABS_TRIGGER =
  "rounded-full px-2 py-1 text-xs font-medium text-center min-w-0 truncate text-text-secondary transition-colors duration-150 ease-out data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-btn-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";
