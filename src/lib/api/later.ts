import { after } from "next/server";

/** Run work after the response is sent; falls back to fire-and-forget outside a request scope (tests). */
export function later(fn: () => Promise<unknown>): void {
  try { after(fn); } catch { void fn().catch(() => {}); }
}
