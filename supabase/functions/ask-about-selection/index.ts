import Anthropic from "npm:@anthropic-ai/sdk@0.24.0";

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
      projectContext,
      projectName,
    } = await req.json();

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

    const systemPrompt = `You are a research assistant helping a researcher understand a specific excerpt from an academic paper.

The researcher's active project is: "${projectName || "unspecified"}"
${projectContext ? `\nProject context:\n${projectContext.slice(0, 2000)}\n` : ""}

Answer the researcher's question about the excerpt directly and concisely. Ground your answer in the excerpt provided — do not speculate beyond what is reasonably inferable from the text. If the excerpt does not contain enough information to answer, say so plainly. Keep answers under 200 words.`;

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
