import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  FileText,
  FlaskConical,
  Lightbulb,
  TrendingUp,
  Users,
} from "lucide-react";
import { SECTION_CONTENT, SECTION_LABEL, TIER_2, TIER_3 } from "./theme";

export type AnalysisSectionKey =
  | "summary"
  | "findings"
  | "relevance"
  | "methodology"
  | "limitations"
  | "sample_size";

const SECTION_CONFIG: Record<
  AnalysisSectionKey,
  { label: string; Icon: LucideIcon; iconClass: string; tier: 2 | 3 }
> = {
  summary: { label: "Summary", Icon: FileText, iconClass: "text-text-secondary", tier: 2 },
  findings: { label: "Key finding", Icon: TrendingUp, iconClass: "text-accent", tier: 3 },
  relevance: { label: "Relevance", Icon: Lightbulb, iconClass: "text-amber", tier: 3 },
  methodology: { label: "Methodology", Icon: FlaskConical, iconClass: "text-text-secondary", tier: 2 },
  limitations: { label: "Limitations", Icon: AlertTriangle, iconClass: "text-text-secondary", tier: 2 },
  sample_size: { label: "Sample size", Icon: Users, iconClass: "text-text-secondary", tier: 2 },
};

interface SectionBlockProps {
  sectionKey: AnalysisSectionKey;
  labelOverride?: string;
  children: ReactNode;
  className?: string;
}

export function SectionBlock({
  sectionKey,
  labelOverride,
  children,
  className = "",
}: SectionBlockProps) {
  const { label, Icon, iconClass, tier } = SECTION_CONFIG[sectionKey];
  const tierClass = tier === 3 ? TIER_3 : TIER_2;

  return (
    <div className={`${tierClass} ${className}`}>
      <p className={SECTION_LABEL}>
        <Icon size={16} className={`flex-shrink-0 ${iconClass}`} strokeWidth={2} />
        <span>{labelOverride ?? label}</span>
      </p>
      <div className={SECTION_CONTENT}>{children}</div>
    </div>
  );
}

export function sectionKeyFromAnalysisKey(key: string): AnalysisSectionKey | null {
  if (key in SECTION_CONFIG) return key as AnalysisSectionKey;
  return null;
}
