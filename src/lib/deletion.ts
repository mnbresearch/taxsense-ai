import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Signing in during the 30-day grace period cancels a pending account
 * deletion (as promised in the deletion confirmation). Best-effort.
 */
export async function cancelPendingDeletionOnSignIn(sb: SupabaseClient, userId: string): Promise<void> {
  try {
    const { data } = await sb
      .from("deletion_requests")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("status", "pending")
      .select("user_id");
    if (data && data.length > 0) {
      await supabaseAdmin()?.from("audit_events").insert({ user_id: userId, event: "deletion_cancelled", meta: { via: "sign-in" } });
    }
  } catch { /* never block sign-in */ }
}
