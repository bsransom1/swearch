import type { HighlightAnalysis } from "../types/highlight-analysis";
import { getAnalysisSections } from "../types/highlight-analysis";

export interface HighlightExportInput {
  paperTitle: string;
  paperUrl: string;
  paperAuthors?: string[] | null;
  paperYear?: number | null;
  highlightText: string;
  analysis: HighlightAnalysis;
  exportedAt?: string;
}

interface TextRange {
  start: number;
  end: number;
}

type StyleSegment =
  | { kind: "title"; range: TextRange }
  | { kind: "meta"; range: TextRange }
  | { kind: "link"; url: string; urlRange: TextRange }
  | { kind: "quote"; range: TextRange }
  | { kind: "sectionHeader"; range: TextRange }
  | { kind: "sectionBody"; range: TextRange }
  | { kind: "relevanceHeader"; range: TextRange }
  | { kind: "relevanceBody"; range: TextRange }
  | { kind: "citation"; range: TextRange }
  | { kind: "separator"; range: TextRange };

const SEPARATOR = "──────────────────────────────";
const GRAY = { red: 0.45, green: 0.45, blue: 0.45 };
const INDIGO_TINT = { red: 0.93, green: 0.95, blue: 1.0 };

/** Strip basic markdown so Docs gets plain text. */
export function stripMarkdownForExport(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/`(.+?)`/g, "$1")
    .trim();
}

export function buildCitationString(input: {
  paperAuthors?: string[] | null;
  paperYear?: number | null;
  paperTitle: string;
  paperUrl: string;
}): string {
  const authors = input.paperAuthors?.filter(Boolean) ?? [];
  const authorPart =
    authors.length === 0
      ? "Unknown author"
      : authors.length <= 3
        ? authors.join(", ")
        : `${authors.slice(0, 3).join(", ")} et al.`;
  const year = input.paperYear ?? "n.d.";
  return `${authorPart} (${year}). "${input.paperTitle}." Retrieved from ${input.paperUrl}`;
}

function formatExportedAt(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildAuthorsYearLine(authors?: string[] | null, year?: number | null): string | null {
  const parts: string[] = [];
  if (authors?.length) {
    const label =
      authors.length <= 2 ? authors.join(", ") : `${authors.slice(0, 2).join(", ")} et al.`;
    parts.push(label);
  }
  if (year) parts.push(String(year));
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Builds plain text + style segments for one highlight export block. */
export function buildHighlightExportContent(input: HighlightExportInput): {
  text: string;
  segments: StyleSegment[];
} {
  let text = "\n";
  const segments: StyleSegment[] = [];

  function addLine(line: string, segment?: StyleSegment) {
    const start = text.length;
    text += `${line}\n`;
    if (segment) segments.push(segment);
    else if (line === SEPARATOR) {
      segments.push({ kind: "separator", range: { start, end: text.length } });
    }
  }

  addLine(SEPARATOR);

  const titleStart = text.length;
  addLine(input.paperTitle);
  segments.push({ kind: "title", range: { start: titleStart, end: text.length } });

  const authorsLine = buildAuthorsYearLine(input.paperAuthors, input.paperYear);
  if (authorsLine) {
    const metaStart = text.length;
    addLine(authorsLine);
    segments.push({ kind: "meta", range: { start: metaStart, end: text.length } });
  }

  text += "Source: ";
  const urlStart = text.length;
  text += input.paperUrl;
  const urlEnd = text.length;
  text += "\n";
  segments.push({
    kind: "link",
    url: input.paperUrl,
    urlRange: { start: urlStart, end: urlEnd },
  });

  const exportedLine = `Exported: ${formatExportedAt(input.exportedAt)}`;
  const exportedStart = text.length;
  addLine(exportedLine);
  segments.push({ kind: "meta", range: { start: exportedStart, end: text.length } });

  text += "\n";
  const quoteStart = text.length;
  const quoted = `"${stripMarkdownForExport(input.highlightText)}"`;
  text += `${quoted}\n\n`;
  segments.push({
    kind: "quote",
    range: { start: quoteStart, end: quoteStart + quoted.length + 1 },
  });

  for (const section of getAnalysisSections(input.analysis)) {
    const isRelevance = section.key === "relevance";
    const headerStart = text.length;
    const headerLabel =
      section.key === "relevance" ? "Relevance to Your Project" : section.label;
    text += `${headerLabel}\n`;
    segments.push({
      kind: isRelevance ? "relevanceHeader" : "sectionHeader",
      range: { start: headerStart, end: text.length },
    });

    const body = stripMarkdownForExport(section.content as string);
    const bodyStart = text.length;
    text += `${body}\n\n`;
    segments.push({
      kind: isRelevance ? "relevanceBody" : "sectionBody",
      range: { start: bodyStart, end: bodyStart + body.length + 1 },
    });
  }

  if (input.analysis.tags.length > 0) {
    const tagsHeaderStart = text.length;
    text += "Tags\n";
    segments.push({
      kind: "sectionHeader",
      range: { start: tagsHeaderStart, end: text.length },
    });
    for (const tag of input.analysis.tags) {
      text += `• ${tag}\n`;
    }
    text += "\n";
  }

  const citation = buildCitationString(input);
  const citationStart = text.length;
  text += `Citation\n${citation}\n`;
  segments.push({ kind: "citation", range: { start: citationStart, end: text.length } });

  addLine(SEPARATOR);
  text += "\n";

  return { text, segments };
}

function toAbsoluteRange(insertIndex: number, range: TextRange) {
  return {
    startIndex: insertIndex + range.start,
    endIndex: insertIndex + range.end,
  };
}

function buildStyleRequests(insertIndex: number, segments: StyleSegment[]): object[] {
  const requests: object[] = [];

  for (const segment of segments) {
    switch (segment.kind) {
      case "link":
        requests.push({
          updateTextStyle: {
            range: toAbsoluteRange(insertIndex, segment.urlRange),
            textStyle: { link: { url: segment.url } },
            fields: "link",
          },
        });
        break;
      case "title": {
        const range = toAbsoluteRange(insertIndex, segment.range);
        requests.push({
          updateTextStyle: {
            range,
            textStyle: {
              bold: true,
              fontSize: { magnitude: 14, unit: "PT" },
            },
            fields: "bold,fontSize",
          },
        });
        break;
      }
      case "meta":
      case "separator": {
        const range = toAbsoluteRange(insertIndex, segment.range);
        requests.push({
          updateTextStyle: {
            range,
            textStyle: {
              fontSize: { magnitude: 10, unit: "PT" },
              foregroundColor: { color: { rgbColor: GRAY } },
            },
            fields: "fontSize,foregroundColor",
          },
        });
        break;
      }
      case "quote": {
        const range = toAbsoluteRange(insertIndex, segment.range);
        requests.push({
          updateParagraphStyle: {
            range,
            paragraphStyle: {
              namedStyleType: "NORMAL_TEXT",
              indentFirstLine: { magnitude: 36, unit: "PT" },
              indentStart: { magnitude: 36, unit: "PT" },
              spaceAbove: { magnitude: 6, unit: "PT" },
              spaceBelow: { magnitude: 6, unit: "PT" },
            },
            fields: "namedStyleType,indentFirstLine,indentStart,spaceAbove,spaceBelow",
          },
        });
        requests.push({
          updateTextStyle: {
            range,
            textStyle: { italic: true, fontSize: { magnitude: 11, unit: "PT" } },
            fields: "italic,fontSize",
          },
        });
        break;
      }
      case "sectionHeader":
      case "relevanceHeader": {
        const range = toAbsoluteRange(insertIndex, segment.range);
        requests.push({
          updateTextStyle: {
            range,
            textStyle: {
              bold: true,
              fontSize: { magnitude: 11, unit: "PT" },
            },
            fields: "bold,fontSize",
          },
        });
        if (segment.kind === "relevanceHeader") {
          requests.push({
            updateParagraphStyle: {
              range,
              paragraphStyle: {
                namedStyleType: "NORMAL_TEXT",
                shading: { backgroundColor: { color: { rgbColor: INDIGO_TINT } } },
              },
              fields: "namedStyleType,shading",
            },
          });
        }
        break;
      }
      case "sectionBody": {
        const range = toAbsoluteRange(insertIndex, segment.range);
        requests.push({
          updateTextStyle: {
            range,
            textStyle: { fontSize: { magnitude: 11, unit: "PT" } },
            fields: "fontSize",
          },
        });
        requests.push({
          updateParagraphStyle: {
            range,
            paragraphStyle: {
              namedStyleType: "NORMAL_TEXT",
              spaceBelow: { magnitude: 6, unit: "PT" },
            },
            fields: "namedStyleType,spaceBelow",
          },
        });
        break;
      }
      case "relevanceBody": {
        const range = toAbsoluteRange(insertIndex, segment.range);
        requests.push({
          updateTextStyle: {
            range,
            textStyle: { fontSize: { magnitude: 11, unit: "PT" } },
            fields: "fontSize",
          },
        });
        requests.push({
          updateParagraphStyle: {
            range,
            paragraphStyle: {
              namedStyleType: "NORMAL_TEXT",
              shading: { backgroundColor: { color: { rgbColor: INDIGO_TINT } } },
              spaceBelow: { magnitude: 8, unit: "PT" },
            },
            fields: "namedStyleType,shading,spaceBelow",
          },
        });
        break;
      }
      case "citation": {
        const range = toAbsoluteRange(insertIndex, segment.range);
        requests.push({
          updateTextStyle: {
            range,
            textStyle: {
              fontSize: { magnitude: 10, unit: "PT" },
              foregroundColor: { color: { rgbColor: GRAY } },
            },
            fields: "fontSize,foregroundColor",
          },
        });
        break;
      }
    }
  }

  return requests;
}

/** Full batchUpdate request list to append a formatted highlight at `insertIndex`. */
export function buildGoogleDocsAppendRequests(
  insertIndex: number,
  input: HighlightExportInput
): object[] {
  const { text, segments } = buildHighlightExportContent(input);
  const endIndex = insertIndex + text.length;

  return [
    {
      insertText: {
        location: { index: insertIndex },
        text,
      },
    },
    {
      deleteParagraphBullets: {
        range: { startIndex: insertIndex, endIndex },
      },
    },
    {
      updateParagraphStyle: {
        range: { startIndex: insertIndex, endIndex },
        paragraphStyle: { namedStyleType: "NORMAL_TEXT" },
        fields: "namedStyleType",
      },
    },
    ...buildStyleRequests(insertIndex, segments),
  ];
}
