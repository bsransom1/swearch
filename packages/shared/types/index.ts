export type { Database, Json } from "./database";
export type {
  HighlightAnalysis,
  ProjectHighlightInsight,
  ProjectHighlightInsightKind,
} from "./highlight-analysis";
export type {
  ProjectGoogleDoc,
  ProjectGoogleDocRole,
  ProjectDocumentContext,
  LinkedDocInventoryItem,
} from "./project-google-doc";
export {
  isContextRole,
  isExportRole,
  roleBadges,
  buildDocumentContextEntries,
  buildLinkedDocInventory,
  formatDocumentsForPrompt,
  findExportDoc,
  findExportDocs,
} from "./project-google-doc";
export type {
  ContextTask,
  HighlightContextItem,
  ProjectContextBundle,
  ProjectChatContext,
  SavedPaperContextItem,
  SavedPaperInventoryItem,
  SavedPaperRow,
} from "./project-chat-context";
export {
  buildDocumentContent,
  buildHighlightContext,
  buildProjectContextBundle,
  buildSavedPaperContext,
  buildSavedPaperInventory,
  formatProjectContextForPrompt,
} from "./project-chat-context";
export type { DiscoveredPaper, PageContextPayload, FindRelatedPapersResult } from "./discovered-paper";
export {
  extractJsonObject,
  getAnalysisSections,
  parseHighlightAnalysis,
  resolveProjectHighlightInsight,
  HIGHLIGHT_ANALYSIS_SECTIONS,
} from "./highlight-analysis";

// Convenience row types
import type { Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ResearchProject = Database["public"]["Tables"]["research_projects"]["Row"];
export type PaperAnalyzed = Database["public"]["Tables"]["papers_analyzed"]["Row"];
export type Highlight = Database["public"]["Tables"]["highlights"]["Row"];
export type PaperRecommendation = Database["public"]["Tables"]["paper_recommendations"]["Row"];
export type ProjectGoogleDocRow = Database["public"]["Tables"]["project_google_docs"]["Row"];
