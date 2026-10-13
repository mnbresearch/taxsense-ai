/**
 * WhatsApp Business (Meta Cloud API) channel — INTERFACE ONLY until configured.
 *
 * Not wired to any data today because:
 *   - no WhatsApp Business account / approved template exists for TaxSense, and
 *   - we do not yet record explicit WhatsApp opt-in (phone consent) per order.
 * When both exist, set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and
 * WHATSAPP_TEMPLATE_CHECKOUT, store a per-order phone opt-in, and call this.
 */
export function whatsappConfigured(): boolean {
  return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE_CHECKOUT);
}

export async function sendWhatsAppTemplate(toE164: string, params: string[]): Promise<{ ok: boolean; error?: string }> {
  if (!whatsappConfigured()) return { ok: false, error: "WhatsApp not configured" };
  if (!/^\+91[6-9]\d{9}$/.test(toE164)) return { ok: false, error: "invalid Indian mobile" };
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toE164.replace("+", ""),
        type: "template",
        template: { name: process.env.WHATSAPP_TEMPLATE_CHECKOUT, language: { code: "en" }, components: [{ type: "body", parameters: params.map((p) => ({ type: "text", text: p.slice(0, 60) })) }] },
      }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
  } catch {
    return { ok: false, error: "network error" };
  }
}
