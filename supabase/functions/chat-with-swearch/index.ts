import Anthropic from "npm:@anthropic-ai/sdk@0.24.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProjectChatContext {
  name: string;
  description: string | null;
  docExcerpt: string | null;
  recentHighlights: string[];
}

function buildSystemPrompt(projectContext: ProjectChatContext | null): string {
  const projectSection = projectContext
    ? `
ACTIVE PROJECT: "${projectContext.name}"
${projectContext.description ? `Description: ${projectContext.description}` : ""}
${
  projectContext.docExcerpt
    ? `\nWorking document excerpt:\n${projectContext.docExcerpt.slice(0, 2000)}`
    : ""
}
${
  projectContext.recentHighlights?.length
    ? `\nRecently captured highlights (most recent first):\n${projectContext.recentHighlights
        .map(
          (h: string, i: number) =>
            `${i + 1}. "${h.slice(0, 150)}${h.length > 150 ? "..." : ""}"`
        )
        .join("\n")}`
    : "\nNo highlights captured yet for this project."
}

When the user asks about "my research", "my highlights", or similar, ground your answer
in the highlights and document excerpt above — don't give generic research advice. If
they ask something the provided context can't answer, say so plainly rather than
guessing.`
    : `
NO ACTIVE PROJECT is set. If the user asks something project-specific, briefly note that
setting an active project would help you give more grounded answers, then still do your
best to help generally.`;

  return `You are Swearch, a research assistant embedded in a browser extension. The
user is a student or researcher. You're shown in a small chat popup, so stay concise —
default to under 150 words, but expand if the user explicitly asks for depth or a longer
explanation.
${projectSection}

Maintain conversational continuity — refer back to earlier parts of this conversation
naturally when relevant, the way a helpful research assistant would in an ongoing
discussion.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, projectContext } = await req.json();

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: buildSystemPrompt(projectContext ?? null),
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    return new Response(JSON.stringify({ data: { reply: responseText } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
