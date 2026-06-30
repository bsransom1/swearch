export type { Database, Json } from "./database";
export type { HighlightAnalysis } from "./highlight-analysis";
export {
  extractJsonObject,
  getAnalysisSections,
  parseHighlightAnalysis,
  HIGHLIGHT_ANALYSIS_SECTIONS,
} from "./highlight-analysis";

// Convenience row types
import type { Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ResearchProject = Database["public"]["Tables"]["research_projects"]["Row"];
export type PaperAnalyzed = Database["public"]["Tables"]["papers_analyzed"]["Row"];
export type Highlight = Database["public"]["Tables"]["highlights"]["Row"];
export type PaperRecommendation = Database["public"]["Tables"]["paper_recommendations"]["Row"];
