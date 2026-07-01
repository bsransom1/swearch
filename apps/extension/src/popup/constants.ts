/** Fixed popup dimensions — keep all views (chat, settings, auth) on the same shell. */
export const POPUP_WIDTH = 380;
export const POPUP_HEIGHT = 600;
export const POPUP_RADIUS = 16;

/** Starter prompts shown above the chat input before the first user message. */
export const SUGGESTED_QUESTIONS = [
  "What is the scope of my project?",
  "What is it missing?",
  "What themes are emerging in my highlights?",
] as const;
