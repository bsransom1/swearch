import Anthropic from "npm:@anthropic-ai/sdk@0.24.0";
import {
  formatProjectContextForPrompt,
  type ProjectContextBundle,
} from "../_shared/project-context.ts";
import { NO_EMDASH_RULE, withoutEmDash } from "../_shared/response-formatting.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildSystemPrompt(bundle: ProjectContextBundle | null): string {
  const projectSection = bundle
    ? formatProjectContextForPrompt(bundle)
    : `NO ACTIVE PROJECT is set. If the user asks something project-specific, briefly note that
setting an active project would help you give more grounded answers, then still do your
best to help generally.`;

  return `You are Swearch, a research assistant embedded in a browser extension. The
user is a student or researcher. You're shown in a small chat popup, so stay concise:
default to under 150 words, but expand if the user explicitly asks for depth or a longer
explanation.

${NO_EMDASH_RULE}

${projectSection}

Maintain conversational continuity: refer back to earlier parts of this conversation
naturally when relevant, the way a helpful research assistant would in an ongoing
discussion.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages } = body;

    // Accept new ProjectContextBundle shape; fall back to legacy format during rollout
    const bundle: ProjectContextBundle | null = body.projectContextBundle ?? null;

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

    const MAX_HISTORY_MESSAGES = 16;
    const trimmedMessages = messages.length > MAX_HISTORY_MESSAGES
      ? messages.slice(messages.length - MAX_HISTORY_MESSAGES)
      : messages;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: buildSystemPrompt(bundle),
      messages: trimmedMessages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const responseText = withoutEmDash(
      message.content[0].type === "text" ? message.content[0].text : ""
    );

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
