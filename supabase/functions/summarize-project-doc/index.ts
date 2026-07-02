import Anthropic from "npm:@anthropic-ai/sdk@0.24.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_INPUT_CHARS = 8000;
const MAX_TOKENS = 600;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { docId } = await req.json();
    if (!docId) {
      return new Response(JSON.stringify({ error: "docId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: row, error: fetchError } = await supabase
      .from("project_google_docs")
      .select("id, user_id, cached_text")
      .eq("id", docId)
      .single();

    if (fetchError || !row) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!row.cached_text?.trim()) {
      return new Response(JSON.stringify({ error: "No cached text available. Sync the document first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inputText = row.cached_text.slice(0, MAX_INPUT_CHARS);

    const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: `Summarize this research document in approximately 300 words. Focus on:
1. The main scope and purpose
2. Central thesis or argument
3. Key themes and topics covered
4. Methodology or approach (if present)
5. Open questions or gaps identified

Be concise and specific. Do not use generic phrases like "this document covers" — instead, describe what it actually says.

DOCUMENT:
${inputText}`,
        },
      ],
    });

    const summary =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    const { error: updateError } = await supabase
      .from("project_google_docs")
      .update({
        summary,
        summary_at: new Date().toISOString(),
      })
      .eq("id", docId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: { summary } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
