/**
 * AYUSH CONNECT — Supabase Edge Function: Match Engine
 * Computes semantic skill overlap between student profile and opportunities
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { studentSkills, requiredSkills } = await req.json();

  if (!studentSkills || !requiredSkills) {
    return new Response(JSON.stringify({ error: "Missing parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const matched = [];
  const missing = [];

  for (const reqSkill of requiredSkills) {
    const isMatched = studentSkills.some((s: string) => 
      s.toLowerCase().includes(reqSkill.toLowerCase()) || 
      reqSkill.toLowerCase().includes(s.toLowerCase())
    );
    if (isMatched) {
      matched.push(reqSkill);
    } else {
      missing.push(reqSkill);
    }
  }

  const matchScore = Math.round((matched.length / requiredSkills.length) * 100);

  return new Response(JSON.stringify({
    match_score: matchScore,
    matched_skills: matched,
    missing_skills: missing,
    suggested_action: missing.length > 0 
      ? `Upskill in ${missing[0]} via platform assessment modules` 
      : "Excellent match! Ready to apply."
  }), {
    headers: { "Content-Type": "application/json" }
  });
});
