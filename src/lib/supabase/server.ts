/**
 * Supabase server helpers (Session 5).
 * Degrades gracefully: with no env vars the app runs in DEMO MODE — an
 * in-memory store per server instance, so the product is fully usable
 * before any infra exists.
 */
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const supabaseConfigured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Cookie-bound client for the logged-in user (RLS enforced). */
export function supabaseServer(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (all: { name: string; value: string; options?: object }[]) => {
          try {
            all.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* called from a Server Component — safe to ignore */
          }
        },
      },
    }
  );
}

/** Service-role client — ADMIN ONLY, server only. Bypasses RLS. */
export function supabaseAdmin(): SupabaseClient | null {
  if (!supabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/* ----------------------- demo-mode in-memory store ----------------------- */
type DemoRecord = { profile: unknown; computation: unknown; intake_state: unknown; updated_at: string };
const g = globalThis as any;
g.__taxsenseDemoStore ??= new Map<string, DemoRecord>();
export const demoStore: Map<string, DemoRecord> = g.__taxsenseDemoStore;
g.__taxsenseDemoEvents ??= [] as { event: string; at: string }[];
export const demoEvents: { event: string; at: string }[] = g.__taxsenseDemoEvents;
