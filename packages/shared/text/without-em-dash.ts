/** Replace em dashes with a spaced hyphen for assistant-facing copy. */
export function withoutEmDash(text: string): string {
  return text.replace(/\u2014/g, " - ");
}

export const NO_EMDASH_RULE =
  "Never use em dashes (—); use commas, periods, or hyphens (-) instead.";
