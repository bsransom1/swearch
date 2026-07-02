import Anthropic from "npm:@anthropic-ai/sdk@0.24.0";
import {
  formatProjectContextForPrompt,
  type ProjectContextBundle,
} from "../_shared/project-context.ts";
import { ASK_RESPONSE_FORMAT } from "../_shared/response-formatting.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      selectionText,
      question,
      paperTitle,
      paperUrl,
      projectContextBundle,
      projectName,
    } = await req.json();

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

    const bundle: ProjectContextBundle | null = projectContextBundle ?? null;
    const projectLabel = projectName || bundle?.project?.name || "unspecified";

    const contextSection = bundle
      ? formatProjectContextForPrompt(bundle)
      : "";

    const systemPrompt = `You are a research assistant helping a researcher understand a specific excerpt from an academic paper.

The researcher's active project is: "${projectLabel}"

${contextSection}

Answer the researcher's question about the excerpt directly and concisely. Ground your answer in the excerpt provided — do not speculate beyond what is reasonably inferable from the text. When relevant, connect your answer to the researcher's project context (linked documents and highlights) shown above. If the excerpt does not contain enough information to answer, say so plainly. Keep answers under 250 words.

${ASK_RESPONSE_FORMAT}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Paper: "${paperTitle || paperUrl}"\n\nExcerpt:\n"${selectionText}"\n\nQuestion: ${question}`,
        },
      ],
    });

    const answer = message.content[0].type === "text" ? message.content[0].text : "";

    return new Response(JSON.stringify({ data: { answer } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
