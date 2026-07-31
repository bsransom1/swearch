import Anthropic from "npm:@anthropic-ai/sdk@0.24.0";
import {
  formatProjectContextForPrompt,
  type ProjectContextBundle,
} from "../_shared/project-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_DISCOVERY_PAPERS = 100;
const FALLBACK_SEARCH_THRESHOLD = 10;

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
  abstract: null;
  url: string;
  doi: string | null;
  citationCount: number | null;
}

interface OpenAlexWork {
  id: string;
  display_name: string;
  publication_year: number | null;
  cited_by_count: number | null;
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
    abstract: null,
    url: workUrl(work),
    doi: workDoi(work),
    citationCount: work.cited_by_count,
  };
}

async function searchOpenAlex(
  query: string,
  perPage = MAX_DISCOVERY_PAPERS
): Promise<OpenAlexWork[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set(
    "select",
    "id,display_name,publication_year,cited_by_count,authorships,doi,ids"
  );

  const res = await fetch(url.toString(), { headers: openAlexHeaders() });
  if (!res.ok) {
    throw new Error(`OpenAlex search failed (${res.status})`);
  }
  const data = await res.json();
  return (data.results ?? []) as OpenAlexWork[];
}

function normalizeDoi(doi: string | null | undefined): string | null {
  if (!doi) return null;
  return doi.replace(/^https?:\/\/doi\.org\//i, "");
}

function dedupePapers(
  papers: DiscoveredPaper[],
  excludeDoi?: string | null,
  limit = MAX_DISCOVERY_PAPERS
): DiscoveredPaper[] {
  const exclude = normalizeDoi(excludeDoi);
  const seen = new Set<string>();
  const result: DiscoveredPaper[] = [];

  for (const p of papers) {
    const key = p.openalexId || p.doi || p.url;
    if (!key || seen.has(key)) continue;
    if (exclude && p.doi && p.doi === exclude) continue;
    seen.add(key);
    result.push(p);
    if (result.length >= limit) break;
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

    const searchResults = await searchOpenAlex(searchQuery, MAX_DISCOVERY_PAPERS);
    let papers = dedupePapers(
      searchResults.map(mapWork).filter((p) => p.title),
      pageContext.doi
    );

    if (papers.length < FALLBACK_SEARCH_THRESHOLD && pageContext.title) {
      const fallback = await searchOpenAlex(pageContext.title, MAX_DISCOVERY_PAPERS);
      papers = dedupePapers(
        [...papers, ...fallback.map(mapWork).filter((p) => p.title)],
        pageContext.doi
      );
    }

    const total = papers.length;

    return new Response(JSON.stringify({ data: { papers, searchQuery, total } }), {
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
