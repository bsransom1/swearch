import Anthropic from "npm:@anthropic-ai/sdk@0.24.0";
import {
  formatProjectContextForPrompt,
  buildLightBundle,
  type ProjectContextBundle,
} from "../_shared/project-context.ts";
import {
  PANEL_MARKDOWN_FORMAT,
  RELEVANCE_FIELD_FORMAT,
} from "../_shared/response-formatting.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FULL_SYSTEM_PROMPT = (projectName: string, contextSection: string) => {
  return `You are a research assistant helping a researcher extract structured insights from academic papers.

The researcher's active project is: "${projectName}"

${contextSection}

${PANEL_MARKDOWN_FORMAT}

When analyzing a highlight, return a JSON object with exactly these fields:
- summary: A 2-3 sentence plain-English summary of what this highlight says
- methodology: The research method used (null if not mentioned)
- findings: The key finding or claim in this highlight (1-2 sentences). May use **bold** for emphasis.
- limitations: Any limitations acknowledged (null if not mentioned)
- sample_size: Sample size or dataset size if mentioned (null if not mentioned)
- relevance: How this is relevant (or not) to the researcher's project context — use the linked documents and highlights above. ${RELEVANCE_FIELD_FORMAT} If not relevant, say so clearly.
- tags: Array of 2-4 keyword tags for this highlight

Respond ONLY with valid JSON. String values may contain Markdown (**bold**, lists). No code fences or text outside the JSON object.`;
};

const CLAIMS_SYSTEM_PROMPT = (contextSection: string) =>
  `You are a research assistant extracting key claims, assertions, and arguments from an academic excerpt.${contextSection ? `\n\n${contextSection}` : ""} These include:
- Factual claims about findings, methods, or data
- Argumentative claims or positions the authors defend
- Assertions about implications, significance, or contributions
- Central arguments being made in this text

Return a JSON object with exactly one field:
- claims: An array of 2-5 clear, standalone statements from the excerpt, each as a single sentence. Prioritize claims that represent the core argument or contribution of the text.

Respond ONLY with valid JSON. No preamble, no markdown.`;

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const candidates = fenced ? [fenced[1].trim(), trimmed] : [trimmed];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // continue
    }

    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(candidate.slice(start, end + 1));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // continue
      }
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      highlightText,
      paperTitle,
      paperUrl,
      projectContextBundle,
      projectName,
      mode = "full",
    } = await req.json();

    const client = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    const isClaimsOnly = mode === "claims_only";
    const bundle: ProjectContextBundle | null = projectContextBundle ?? null;
    const projectLabel = projectName || bundle?.project?.name || "unspecified";

    let systemPrompt: string;
    if (isClaimsOnly) {
      const lightBundle = bundle ? buildLightBundle(bundle, "claims") : null;
      const contextSection = lightBundle
        ? formatProjectContextForPrompt(lightBundle, { includeDocContent: false })
        : "";
      systemPrompt = CLAIMS_SYSTEM_PROMPT(contextSection);
    } else {
      const contextSection = bundle
        ? formatProjectContextForPrompt(bundle)
        : "";
      systemPrompt = FULL_SYSTEM_PROMPT(projectLabel, contextSection);
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: isClaimsOnly ? 512 : 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Paper: "${paperTitle || paperUrl}"\n\nHighlight:\n\n${highlightText}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let parsed = extractJsonObject(responseText);

    if (!parsed) {
      if (isClaimsOnly) {
        parsed = { claims: [] };
      } else {
        parsed = {
          summary: responseText.trim(),
          methodology: null,
          findings: null,
          limitations: null,
          sample_size: null,
          relevance: null,
          tags: [],
        };
      }
    }

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
