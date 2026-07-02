/** Shared formatting instructions for panel-facing edge function responses. */
export const NO_EMDASH_RULE =
  "Never use em dashes (—); use commas, periods, or hyphens (-) instead.";

export function withoutEmDash(text: string): string {
  return text.replace(/\u2014/g, " - ");
}

export const PANEL_MARKDOWN_FORMAT = `
Response formatting (required; the UI renders Markdown):
- Use **bold** for section titles and key terms. Do NOT use # or ## headings; use bold labels on their own line instead.
- ${NO_EMDASH_RULE}
- Use numbered lists (1. 2. 3.) when presenting multiple points or steps.
- Use bullet lists (- item) for non-sequential items.
- Put a blank line between paragraphs and between sections.
- You may use --- once to separate two major sections (e.g. excerpt analysis vs. project connection).
- Keep answers scannable in a narrow panel (~320px wide). Short paragraphs beat long blocks.
- Do not wrap the entire response in a code block.`;

export const ASK_RESPONSE_FORMAT = `${PANEL_MARKDOWN_FORMAT}

Structure longer answers like this when both excerpt and project context matter:
1. **Answer**: direct response to the question about the excerpt.
2. **Project connection**: how this relates to linked docs/highlights (or state clearly if it doesn't).
Use numbered sections only when both parts are needed; keep single-focus answers to one short block.`;

export const RELEVANCE_FIELD_FORMAT = `Use Markdown in this string: **bold** key terms, numbered lists for multiple connection points, blank lines between paragraphs. No # headings. ${NO_EMDASH_RULE}`;
