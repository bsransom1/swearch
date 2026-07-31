#!/usr/bin/env node
/**
 * Seeds the Chrome Web Store reviewer account in production Supabase.
 * Requires SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL in env (or .env.local).
 *
 * Usage: node scripts/seed-reviewer-account.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const REVIEWER_EMAIL = "reviewer@swearch.app";
const REVIEWER_PASSWORD = "SwearchReview2026!";
const PROJECT_NAME = "testx";

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: existing } = await admin.auth.admin.listUsers();
  let userId = existing?.users?.find((u) => u.email === REVIEWER_EMAIL)?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: REVIEWER_EMAIL,
      password: REVIEWER_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Chrome Store Reviewer" },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log("Created reviewer user:", userId);
  } else {
    console.log("Reviewer user already exists:", userId);
  }

  const { data: projects } = await admin
    .from("research_projects")
    .select("id")
    .eq("user_id", userId)
    .eq("name", PROJECT_NAME);

  if (projects?.length) {
    console.log("testx project already seeded");
    return;
  }

  const projectId = crypto.randomUUID();
  const paperId = crypto.randomUUID();

  await admin.from("research_projects").insert({
    id: projectId,
    user_id: userId,
    name: PROJECT_NAME,
    description: "Sample project for Chrome Web Store reviewers.",
    google_doc_id: "1O3MSb6_7_cXhw9p25Ff_2pF29OwFCfacJmI5M520WJM",
    google_doc_title: "Swearch Reviewer Export Doc",
    is_active: true,
  });

  await admin.from("project_google_docs").insert({
    project_id: projectId,
    user_id: userId,
    google_doc_id: "1O3MSb6_7_cXhw9p25Ff_2pF29OwFCfacJmI5M520WJM",
    title: "Swearch Reviewer Export Doc",
    role: "both",
    sort_order: 0,
  });

  await admin.from("papers_analyzed").insert({
    id: paperId,
    user_id: userId,
    project_id: projectId,
    paper_title:
      "Native and invasive squirrels show different behavioural responses to scent of a shared native predator",
    paper_url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7062111/",
    paper_doi: "10.1098/rsos.191841",
    paper_abstract:
      "Study comparing anti-predator behavioural responses of native red squirrels vs invasive grey squirrels.",
    highlight_count: 2,
  });

  await admin.from("highlights").insert([
    {
      user_id: userId,
      paper_id: paperId,
      project_id: projectId,
      highlight_text:
        "Red squirrels responded to pine marten scent by avoiding the feeder, increasing their vigilance and decreasing their feeding activity.",
      ai_summary:
        "Native red squirrels exhibited strong anti-predator responses to pine marten scent while invasive grey squirrels showed none.",
      ai_methodology: "Experimental exposure to predator scent cues with behavioural observation.",
      ai_findings:
        "Red squirrels avoided feeders and increased vigilance; grey squirrels showed no anti-predator response.",
      ai_relevance: "Relevant to invasive species ecology in the testx sample project.",
    },
    {
      user_id: userId,
      paper_id: paperId,
      project_id: projectId,
      highlight_text:
        "Data were collected at 20 sites in Northern Ireland using camera traps and baited feeders with pine marten scent.",
      ai_summary:
        "A two-week field experiment at 20 sites used camera traps and feeders to compare squirrel responses to pine marten scent.",
      ai_methodology: "Field experiment with camera traps and before-after scent treatment.",
      ai_findings: "Controlled two-week exposure design at 20 allopatric squirrel populations.",
      ai_relevance: "Useful reference for camera-trap field protocols.",
    },
  ]);

  console.log("Seeded testx project with 2 highlights");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
