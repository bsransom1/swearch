import Anthropic from "npm:@anthropic-ai/sdk@0.24.0";
import {
  formatProjectContextForPrompt,
  type ProjectContextBundle,
} from "../_shared/project-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PageContext {
  url: string;
  title: string | null;
  abstract: string | null;
  doi: string | null;
  conclusion: string | null;
  isLikelyPaper: boolean;
}

interface DiscoveredPaper {
  openalexId: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  url: string;
  doi: string | null;
  citationCount: number | null;
  relevanceReason?: string;
}

interface OpenAlexWork {
  id: string;
  display_name: string;
  publication_year: number | null;
  cited_by_count: number | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  authorships?: { author?: { display_name?: string } }[];
  doi?: string | null;
  ids?: { doi?: string; openalex?: string };
}

function openAlexHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  const key =
    Deno.env.get("OPEN_ALEX_API_KEY") ??
    Deno.env.get("OPENALEX_API_KEY") ??
    "";
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

function reconstructAbstract(
  inverted: Record<string, number[]> | null | undefined
): string | null {
  if (!inverted) return null;
  const tokens: [number, string][] = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) tokens.push([pos, word]);
  }
  if (tokens.length === 0) return null;
  tokens.sort((a, b) => a[0] - b[0]);
  return tokens.map((t) => t[1]).join(" ");
}

function workUrl(work: OpenAlexWork): string {
  const doi = work.doi ?? work.ids?.doi;
  if (doi) {
    const normalized = doi.replace(/^https?:\/\/doi\.org\//i, "");
    return `https://doi.org/${normalized}`;
  }
  return work.id;
}

function workDoi(work: OpenAlexWork): string | null {
  const raw = work.doi ?? work.ids?.doi ?? null;
  if (!raw) return null;
  return raw.replace(/^https?:\/\/doi\.org\//i, "");
}

function mapWork(work: OpenAlexWork): DiscoveredPaper {
  return {
    openalexId: work.id,
    title: work.display_name,
    authors:
      work.authorships
        ?.map((a) => a.author?.display_name)
        .filter((n): n is string => !!n) ?? [],
    year: work.publication_year,
    abstract: reconstructAbstract(work.abstract_inverted_index),
    url: workUrl(work),
    doi: workDoi(work),
    citationCount: work.cited_by_count,
  };
}

async function fetchOpenAlexWorkByDoi(doi: string): Promise<OpenAlexWork | null> {
  const normalized = doi.replace(/^https?:\/\/doi\.org\//i, "");
  const res = await fetch(
    `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(normalized)}`,
    { headers: openAlexHeaders() }
  );
  if (!res.ok) return null;
  return (await res.json()) as OpenAlexWork;
}

async function searchOpenAlex(query: string, perPage = 8): Promise<OpenAlexWork[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set(
    "select",
    "id,display_name,publication_year,cited_by_count,abstract_inverted_index,authorships,doi,ids"
  );

  const res = await fetch(url.toString(), { headers: openAlexHeaders() });
  if (!res.ok) {
    throw new Error(`OpenAlex search failed (${res.status})`);
  }
  const data = await res.json();
  return (data.results ?? []) as OpenAlexWork[];
}

function dedupePapers(papers: DiscoveredPaper[], excludeDoi?: string | null): DiscoveredPaper[] {
  const seen = new Set<string>();
  const result: DiscoveredPaper[] = [];
  for (const p of papers) {
    const key = p.openalexId || p.doi || p.url;
    if (!key || seen.has(key)) continue;
    if (excludeDoi && p.doi && p.doi === excludeDoi.replace(/^https?:\/\/doi\.org\//i, "")) {
      continue;
    }
    seen.add(key);
    result.push(p);
    if (result.length >= 5) break;
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const pageContext = body.pageContext as PageContext;
    const bundle = (body.projectContextBundle ?? null) as ProjectContextBundle | null;

    if (!pageContext?.url) {
      return new Response(JSON.stringify({ error: "pageContext.url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
    const projectSection = bundle ? formatProjectContextForPrompt(bundle) : "No active project context.";

    const pageBlock = [
      `Page URL: ${pageContext.url}`,
      pageContext.title ? `Page title: ${pageContext.title}` : "",
      pageContext.doi ? `DOI: ${pageContext.doi}` : "",
      pageContext.abstract ? `Abstract excerpt: ${pageContext.abstract.slice(0, 500)}` : "",
      pageContext.conclusion ? `Conclusion excerpt: ${pageContext.conclusion.slice(0, 300)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const queryResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 80,
      system:
        "You synthesize academic paper search queries. Return ONLY a concise OpenAlex search query (max 15 words). No quotes, no explanation.",
      messages: [
        {
          role: "user",
          content: `${pageBlock}\n\nProject context:\n${projectSection.slice(0, 2500)}\n\nSearch query:`,
        },
      ],
    });

    let searchQuery =
      queryResponse.content[0].type === "text"
        ? queryResponse.content[0].text.trim().replace(/^["']|["']$/g, "")
        : pageContext.title ?? "research";

    if (!searchQuery) {
      searchQuery = pageContext.title ?? "academic research";
    }

    const candidates: OpenAlexWork[] = [];

    if (pageContext.doi) {
      const current = await fetchOpenAlexWorkByDoi(pageContext.doi);
      if (current) candidates.push(current);
    }

    const searchResults = await searchOpenAlex(searchQuery, 10);
    candidates.push(...searchResults);

    const excludeDoi = pageContext.doi;
    let papers = dedupePapers(
      candidates.map(mapWork).filter((p) => p.title),
      excludeDoi
    );

    if (papers.length < 3 && pageContext.title) {
      const fallback = await searchOpenAlex(pageContext.title, 8);
      papers = dedupePapers(
        [...papers, ...fallback.map(mapWork)],
        excludeDoi
      );
    }

    papers = papers.slice(0, 5);

    if (papers.length > 0) {
      const paperList = papers
        .map(
          (p, i) =>
            `${i + 1}. "${p.title}" (${p.year ?? "n/a"}) — ${(p.abstract ?? "").slice(0, 200)}`
        )
        .join("\n");

      const relevanceResponse = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        system: `For each numbered paper, write ONE short sentence (max 25 words) explaining why it is relevant to the user's current page and project. Return JSON array of strings in order, same length as input. Example: ["Reason 1", "Reason 2"]`,
        messages: [
          {
            role: "user",
            content: `Current page: "${pageContext.title ?? pageContext.url}"\n\nProject:\n${projectSection.slice(0, 1500)}\n\nPapers:\n${paperList}`,
          },
        ],
      });

      const raw =
        relevanceResponse.content[0].type === "text"
          ? relevanceResponse.content[0].text.trim()
          : "[]";

      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        const reasons = JSON.parse(jsonMatch?.[0] ?? "[]") as string[];
        papers = papers.map((p, i) => ({
          ...p,
          relevanceReason: reasons[i]?.trim() || "Related to your research topic.",
        }));
      } catch {
        papers = papers.map((p) => ({
          ...p,
          relevanceReason: "Related to your research topic.",
        }));
      }
    }

    return new Response(JSON.stringify({ data: { papers, searchQuery } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
