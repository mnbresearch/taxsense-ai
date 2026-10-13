import type { Metadata } from "next";
import Link from "next/link";
import DevConsole from "./DevConsole";

export const metadata: Metadata = {
  title: "Developers & API | TaxSense AI",
  description: "TaxSense AI REST API: tax computation under both regimes, Form 16/AIS parsing, deadlines, saved profiles and signed webhooks.",
  alternates: { canonical: "https://taxsense.mnbresearch.com/developers" },
};

const code = "block overflow-x-auto rounded-lg bg-stone-900 p-3 text-xs leading-relaxed text-stone-100";
const H2 = "mt-10 text-xl font-bold text-stone-900";

export default function Developers() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/" className="text-sm font-bold text-brand-700">← TaxSense AI</Link>
      <h1 className="mt-6 text-3xl font-bold">Developers &amp; API</h1>
      <p className="mt-2 text-stone-600">
        Use TaxSense's engine from your own software: compute tax under both regimes, parse Form 16/AIS text, read the deadline calendar,
        manage saved profiles and receive signed webhooks. Base URL <code>https://taxsense.mnbresearch.com/api/v1</code> ·
        {" "}<a href="/api/v1/openapi.json" className="font-semibold text-brand-700 underline">OpenAPI spec</a>.
      </p>

      <h2 className={H2}>1. Authenticate</h2>
      <p className="mt-2 text-sm text-stone-600">Create a key below (you need to be signed in). Send it as a bearer token from your <strong>server</strong> — never ship keys in browser or mobile apps.</p>
      <pre className={code}>{`curl https://taxsense.mnbresearch.com/api/v1/me \\
  -H "Authorization: Bearer tsk_xxxxxxxxxxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`}</pre>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-600">
        <li>Keys carry <strong>scopes</strong>; a request without the needed scope gets <code>403 forbidden</code>.</li>
        <li>Keys expire (7–365 days). Rotate with an optional overlap of up to 24 h; revoke instantly.</li>
        <li>Limits per key: free 30/min &amp; 500/day; paid plans 120/min &amp; 10,000/day. <code>429</code> responses include <code>Retry-After</code>.</li>
        <li>Errors: <code>{`{ "error": { "code", "message" }, "requestId" }`}</code>. Success: <code>{`{ "data": … }`}</code>.</li>
      </ul>

      <h2 className={H2}>2. Compute tax</h2>
      <pre className={code}>{`curl -X POST https://taxsense.mnbresearch.com/api/v1/compute \\
  -H "Authorization: Bearer $TAXSENSE_KEY" -H "Content-Type: application/json" \\
  -d '{"profile":{"age":32,"residentialStatus":"resident","houseProperties":[],
       "salary":{"grossSalary":1800000,"basicPlusDA":900000,"hraReceived":360000,
                 "rentPaid":420000,"isMetroCity":true,"professionalTax":2500},
       "deductions":{"section80C":150000,"section80D_selfFamily":25000},"taxesPaid":0}}'`}</pre>
      <p className="mt-2 text-sm text-stone-600">Returns both regimes (taxable income, rebate, surcharge, cess, total tax, net payable), the recommended regime, the right ITR form and ranked saving moves.</p>

      <h2 className={H2}>3. Other endpoints</h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-xs text-stone-500"><tr><th className="py-1">Endpoint</th><th>Scope</th><th>What it does</th></tr></thead>
        <tbody className="text-stone-700">
          {[
            ["POST /documents/parse", "documents:parse", "Form 16 Part B / AIS text → amounts. Deterministic, no AI, nothing stored."],
            ["GET /deadlines", "deadlines:read", "Income-tax due dates (?from=YYYY-MM-DD&limit=)."],
            ["GET /profiles", "profiles:read", "Your saved profiles, newest first (?limit=&cursor=)."],
            ["GET /profiles/{id}", "profiles:read", "One profile with its full inputs."],
            ["POST /profiles", "profiles:write", "Create/update by label (idempotent per label)."],
            ["DELETE /profiles/{id}", "profiles:write", "Delete a profile."],
            ["GET|POST /webhooks", "webhooks:manage", "List / register endpoints."],
            ["POST /webhooks/{id}/test", "webhooks:manage", "Send a signed test event."],
            ["GET /health", "—", "Integration health check (no auth)."],
          ].map(([e, s, d]) => (
            <tr key={e} className="border-t border-stone-100"><td className="py-1.5"><code className="text-xs">{e}</code></td><td><code className="text-xs">{s}</code></td><td className="text-xs">{d}</td></tr>
          ))}
        </tbody>
      </table>

      <h2 className={H2}>4. Webhooks</h2>
      <p className="mt-2 text-sm text-stone-600">
        Events: <code>profile.saved</code>, <code>profile.deleted</code>, <code>plan.activated</code> (sent only after a verified payment).
        Payloads carry IDs and summaries, not full tax inputs. Retries: 0 s, 2 s, 8 s, then once more within 24 h. Redirects are not followed.
      </p>
      <pre className={code}>{`// Node — verify TaxSense-Signature: t=<unix>,v1=<hex>
import { createHmac, timingSafeEqual } from "crypto";
function verify(secret, rawBody, header) {
  const p = Object.fromEntries(header.split(",").map((x) => x.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(p.t)) > 300) return false;
  const want = createHmac("sha256", secret).update(p.t + "." + rawBody).digest("hex");
  return want.length === p.v1.length && timingSafeEqual(Buffer.from(want), Buffer.from(p.v1));
}
// Use the TaxSense-Delivery header as an idempotency key.`}</pre>

      <h2 className={H2}>5. Your keys &amp; endpoints</h2>
      <div className="mt-3"><DevConsole /></div>

      <p className="mt-10 text-xs text-stone-400">
        Computations are informational, not tax advice. API use is covered by our <Link href="/terms" className="underline">Terms</Link> and
        {" "}<Link href="/privacy" className="underline">Privacy Policy</Link>. Questions: contact@mnbresearch.com.
      </p>
    </main>
  );
}
