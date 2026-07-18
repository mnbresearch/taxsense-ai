import { NextResponse } from "next/server";
import { computeBoth, emptyProfile } from "@/lib/tax-engine";
import { supabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Health + engine self-test: verifies a known anchor case at runtime. */
export async function GET() {
  const p = emptyProfile();
  p.salary = {
    grossSalary: 1_275_000, basicPlusDA: 637_500, hraReceived: 0, rentPaid: 0,
    isMetroCity: false, employerNpsContribution: 0, professionalTax: 0,
  };
  const c = computeBoth(p);
  const engineOk = c.new.totalTaxLiability === 0 && c.old.totalTaxLiability === 187_200;
  return NextResponse.json(
    {
      status: engineOk ? "ok" : "degraded",
      engineSelfTest: engineOk ? "pass (₹12.75L anchor case)" : "FAIL — slab constants may be corrupted",
      fy: "2025-26",
      providers: {
        intake: process.env.GROQ_API_KEY ? "groq" : process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock",
        supabase: supabaseConfigured() ? "configured" : "demo-mode",
        email: process.env.RESEND_API_KEY ? "resend" : "not configured",
      },
      build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "dev",
      time: new Date().toISOString(),
    },
    { status: engineOk ? 200 : 500 }
  );
}
