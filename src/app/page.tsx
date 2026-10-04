import Link from "next/link";
import RequestAccess from "./RequestAccess";
import TaxCheck from "./TaxCheck";
import InstallApp from "./InstallApp";
import { PRO_TOOLS, type ProTool } from "@/lib/pro";
import { nextDeadline } from "@/lib/deadlines";

/**
 * Landing page — full product overview.
 * Every feature listed here exists in the app today; tool cards are rendered
 * from the live catalog (src/lib/pro.ts) so the page can't drift from the product.
 * The hero example is engine-verified (see tests/landing-claims.test.ts).
 */
export const revalidate = 3600; // hourly — keeps the deadline pill current

const TIER_BADGE: Record<ProTool["tier"], { label: string; cls: string }> = {
  free: { label: "Free", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pro: { label: "Pro", cls: "bg-brand-50 text-brand-700 border-brand-100" },
  business: { label: "Business", cls: "bg-amber-50 text-amber-800 border-amber-200" },
};

const tool = (id: string) => PRO_TOOLS.find((t) => t.id === id);
function ToolCards({ ids }: { ids: string[] }) {
  const tools = ids.map(tool).filter((t): t is ProTool => !!t);
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          className="group flex flex-col rounded-xl border border-stone-200 bg-white p-4 transition hover:border-brand-600 hover:shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xl">{t.icon}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TIER_BADGE[t.tier].cls}`}>
              {TIER_BADGE[t.tier].label}
            </span>
          </div>
          <span className="mt-1.5 text-sm font-semibold text-stone-800 group-hover:text-brand-700">{t.title}</span>
          <span className="mt-0.5 line-clamp-3 text-xs text-stone-500">{t.desc}</span>
        </Link>
      ))}
    </div>
  );
}

/** The conversational workspace's built-in capabilities (not separate tools). */
const WORKSPACE = [
  ["💬", "Talk, don't fill forms", "Describe your year in plain English or Hindi — “18 LPA, 35k rent in Mumbai, 1.5L in PPF”. It structures, annualises and asks only what matters next."],
  ["⚖️", "Both regimes, every time", "Old vs new computed side by side for FY 2025-26: slabs, 87A rebate with marginal relief, surcharge, HRA (Rule 2A), capital gains at special rates, cess."],
  ["🔍", "Show the working", "Every line of the computation, from gross income to final tax, with the section behind it — the audit trail a CA would write, reconciled to the rupee."],
  ["🎯", "₹-quantified moves", "A ranked optimizer: NPS 80CCD(1B), 80C/80D headroom, employer NPS, LTCG harvesting — each with the exact rupees it saves you."],
  ["🧩", "What-if planner & CTC Designer", "Drag numbers and watch tax change live. Pro: design the salary structure to ask HR for (HRA, NPS, allowances)."],
  ["📄", "Filing-ready PDF", "Computation, regime call, ITR form, advance-tax calendar and document checklist — file it yourself or hand it to your CA."],
];

const AUDIENCES = [
  {
    icon: "💼",
    who: "Salaried employees",
    pain: "Which regime? Is my employer's TDS right? Why does Form 16 not match AIS?",
    gets: ["Paste Form 16 / AIS → numbers filled in", "Both-regime answer with the working shown", "HRA, 80C/80D/NPS gaps priced in ₹", "In-hand salary, gratuity & rent-receipt tools"],
    cta: ["/app", "Compute my tax free"],
  },
  {
    icon: "🚀",
    who: "Freelancers & business owners",
    pain: "44ADA or regular books? How much advance tax? Will I need an audit or GST?",
    gets: ["Presumptive 44AD/44ADA maths", "Advance-tax planner that avoids 234B/C interest", "GST toolkit, TDS desk and audit (44AB) triggers", "60-second Tax Guide: what you must file"],
    cta: ["/guide", "Take the Tax Guide"],
  },
  {
    icon: "📈",
    who: "Investors, property sellers & NRIs",
    pain: "Tax on my shares and mutual funds? Selling a flat? Am I resident this year?",
    gets: ["LTCG harvesting planner (₹1.25L s.112A)", "Property sale planner — 54/54EC/54F, indexation choice", "Residency status & gift-tax desk", "Capital gains in the main computation"],
    cta: ["/tools/property", "Plan a sale"],
  },
  {
    icon: "⚖️",
    who: "CAs, lawyers, firms & students",
    pain: "The same calculations every season, for every client, under deadline pressure.",
    gets: ["234A/B/C interest, regime breakeven matrix", "26AS reconciliation & notice reply drafts", "Client Workbook for your whole book", "Section reference, quiz and glossary for students"],
    cta: ["/professional", "Open the Professional Suite"],
  },
];

export default function Landing() {
  const dl = nextDeadline();
  return (
    <main>
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div className="text-lg font-bold text-brand-700">
          TaxSense <span className="font-normal text-stone-400">AI</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <a href="#features" className="text-stone-600 hover:text-brand-700">Features</a>
          <Link href="/tools" className="text-stone-600 hover:text-brand-700">Tools</Link>
          <Link href="/professional" className="text-stone-600 hover:text-brand-700">For professionals</Link>
          <Link href="/pricing" className="text-stone-600 hover:text-brand-700">Pricing</Link>
          <Link href="/deadlines" className="text-stone-600 hover:text-brand-700">Deadlines</Link>
          <InstallApp />
          <Link href="/app" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
            Try it free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-14 pt-10 text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-600">
          An MNB Research product · Income tax · FY 2025-26 (AY 2026-27)
        </p>
        {dl && (
          <Link
            href="/deadlines"
            className="mx-auto mb-5 inline-block rounded-full bg-amber-100 px-4 py-1.5 text-sm font-bold text-amber-800 hover:bg-amber-200"
          >
            ⏳ Next: {dl.label} — {dl.days} day{dl.days === 1 ? "" : "s"} left
          </Link>
        )}
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Indian income tax, worked out like a CA would — in one conversation.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-stone-600">
          Tell TaxSense how you earn. It computes your tax under <em>both</em> regimes, shows every line of the working,
          prices the savings you&apos;re missing, picks your ITR form and hands you a filing-ready file — plus 25+ calculators
          for salaried people, businesses, investors and tax professionals.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/app" className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
            Start free — no signup →
          </Link>
          <a href="#features" className="rounded-lg border border-stone-300 px-6 py-3 font-semibold text-stone-700 hover:border-brand-600">
            See everything inside
          </a>
        </div>
        <p className="mt-4 text-sm text-stone-500">Your numbers are never used to train AI models. Delete your account and data any time.</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
          🏆 Shark Tank India featured &nbsp;·&nbsp; 📋 DPIIT-recognised startup &nbsp;·&nbsp; MNB Research × Abrobot.ai
        </p>

        {/* Engine-verified example (tests/landing-claims.test.ts) */}
        <div className="mx-auto mt-10 max-w-lg rounded-2xl bg-stone-900 p-5 text-left shadow-2xl">
          <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400"></span>
            <span className="text-xs font-semibold text-emerald-100">TaxSense AI — example session</span>
          </div>
          <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white">
            I earn <strong>18 LPA</strong> (basic is half), pay <strong>35k rent in Mumbai</strong>, put 1.5L in PPF and 25k in health insurance.
          </div>
          <div className="mt-2.5 max-w-[88%] rounded-2xl rounded-bl-sm bg-white/95 px-4 py-2.5 text-sm text-stone-800">
            HRA exemption ₹3,30,000 under Rule 2A, 80C at cap, 80D ₹25,000.{" "}
            <strong className="text-brand-700">Old regime ₹1,92,660 · New regime ₹1,50,800 → the new regime saves you ₹41,860.</strong>{" "}
            Want the line-by-line working, or your filing kit?
          </div>
        </div>
      </section>

      {/* Proof strip */}
      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-8 text-center sm:grid-cols-4">
          {[
            ["Both regimes", "computed for every profile"],
            ["280+", "automated engine checks"],
            ["25+ tools", "most of them free"],
            ["Form 16 & AIS", "import — review, don't retype"],
          ].map(([h, s]) => (
            <div key={h}>
              <div className="text-xl font-bold text-brand-700">{h}</div>
              <p className="mt-0.5 text-xs text-stone-500">{s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-center text-3xl font-bold text-stone-800">Built for how you earn</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-stone-600">
          One engine, four very different tax lives. Pick yours.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a) => (
            <div key={a.who} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6">
              <div className="text-3xl">{a.icon}</div>
              <h3 className="mt-2 font-bold text-stone-800">{a.who}</h3>
              <p className="mt-1 text-sm italic text-stone-500">“{a.pain}”</p>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-stone-700">
                {a.gets.map((g) => (
                  <li key={g} className="flex gap-2"><span className="text-brand-600">✓</span><span>{g}</span></li>
                ))}
              </ul>
              <Link href={a.cta[0]} className="mt-4 text-sm font-semibold text-brand-700 hover:underline">{a.cta[1]} →</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Full feature overview */}
      <section id="features" className="border-t border-stone-200 bg-stone-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-center text-3xl font-bold text-stone-800">Everything inside TaxSense</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-stone-600">
            The complete product, in one place. Free features need no signup; Pro and Business unlock the practitioner tools.
          </p>

          <h3 className="mt-10 text-lg font-bold text-stone-800">1 · The AI tax workspace</h3>
          <p className="text-sm text-stone-500">The core app at <Link href="/app" className="font-semibold text-brand-700 underline">/app</Link> — a conversation on the left, a live computation on the right.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WORKSPACE.map(([icon, t, d]) => (
              <div key={t} className="rounded-xl border border-stone-200 bg-white p-4">
                <span className="text-xl">{icon}</span>
                <span className="mt-1.5 block text-sm font-semibold text-stone-800">{t}</span>
                <span className="mt-0.5 block text-xs text-stone-500">{d}</span>
              </div>
            ))}
          </div>

          <h3 className="mt-12 text-lg font-bold text-stone-800">2 · Import, check &amp; file</h3>
          <p className="text-sm text-stone-500">From your documents to a return you can file with confidence.</p>
          <ToolCards ids={["import", "filing", "tds", "notices", "rent-receipts", "calendar"]} />

          <h3 className="mt-12 text-lg font-bold text-stone-800">3 · Planning calculators</h3>
          <p className="text-sm text-stone-500">Every one runs the same deterministic FY 2025-26 engine as the app.</p>
          <ToolCards ids={["take-home", "hra", "80gg", "gratuity", "advance-tax", "harvest", "property", "residency", "slabs", "breakeven", "playbook", "ctc"]} />

          <h3 className="mt-12 text-lg font-bold text-stone-800">4 · Practice suite for professionals</h3>
          <p className="text-sm text-stone-500">For CAs, tax lawyers and firms running many clients.</p>
          <ToolCards ids={["gst", "tds-rates", "audit", "interest", "clients", "campaigns", "pdfs"]} />

          <h3 className="mt-12 text-lg font-bold text-stone-800">5 · Learn the law</h3>
          <p className="text-sm text-stone-500">Plain-language references — free forever.</p>
          <ToolCards ids={["sections", "glossary", "quiz"]} />
          <p className="mt-3 text-xs text-stone-500">
            Also free: the <Link href="/guide" className="font-semibold text-brand-700 underline">60-second Tax Guide</Link> (what you must file, before any numbers),
            the <Link href="/deadlines" className="font-semibold text-brand-700 underline">deadline calendar with email reminders</Link> and
            {" "}<Link href="/compare" className="font-semibold text-brand-700 underline">how we compare</Link> with DIY portals and CAs.
          </p>
        </div>
      </section>

      <TaxCheck />

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="text-center text-3xl font-bold">How it works</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {[
            { n: "1", t: "Tell it, or import it", d: "Chat in plain words, or paste your Form 16 / AIS text. TaxSense fills the profile and asks only for what's missing." },
            { n: "2", t: "See both regimes — and why", d: "A deterministic, section-cited computation under the old and new regime, with “Show the working” for every rupee." },
            { n: "3", t: "Walk away filing-ready", d: "Your ITR form, document checklist, scrutiny red flags, filing sheet and summary PDF — file on the portal or hand it to your CA." },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-stone-200 bg-white p-6">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-bold text-white">{s.n}</div>
              <h3 className="font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-stone-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & honesty */}
      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="text-center text-2xl font-bold text-stone-800">Accurate, private — and honest about limits</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 p-5">
              <h3 className="font-semibold text-stone-800">🧮 The maths is deterministic</h3>
              <p className="mt-1 text-sm text-stone-600">AI understands your words; a rule-based engine does the tax. Same input, same answer — checked by 280+ automated tests against hand-computed cases and a self-test on every deployment.</p>
            </div>
            <div className="rounded-2xl border border-stone-200 p-5">
              <h3 className="font-semibold text-stone-800">🔒 Your data stays yours</h3>
              <p className="mt-1 text-sm text-stone-600">Saved profiles are locked to your login by row-level security. 26AS reconciliation runs in your browser. Export everything or delete your account (30-day grace) from the app.</p>
            </div>
            <div className="rounded-2xl border border-stone-200 p-5">
              <h3 className="font-semibold text-stone-800">🧭 What we don&apos;t do (yet)</h3>
              <p className="mt-1 text-sm text-stone-600">We don&apos;t e-file on the portal for you — you or your CA file, or choose Filed For You. The ITR-1 JSON is a draft to review, not a certified upload. Complex cases still deserve a CA.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="text-center text-2xl font-bold text-stone-800">Start free. Upgrade when it pays for itself.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
            <div className="text-sm font-bold uppercase tracking-wide text-stone-500">Starter</div>
            <div className="mt-2 text-3xl font-bold text-stone-800">₹0</div>
            <p className="mt-2 text-sm text-stone-600">The full both-regime workspace, Show the working, Form 16/AIS import, Filing Kit, 2 PDFs a day and every free tool.</p>
          </div>
          <div className="relative rounded-2xl border-2 border-brand-600 bg-white p-6 text-center shadow-md">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-bold text-white">Most popular</span>
            <div className="text-sm font-bold uppercase tracking-wide text-brand-700">Pro</div>
            <div className="mt-2 text-3xl font-bold text-stone-800">₹399<span className="text-base font-medium text-stone-400">/mo</span></div>
            <p className="mt-2 text-sm text-stone-600">CTC Designer, unlimited PDFs, 234 interest, breakeven matrix, 26AS reconciliation and notice drafts.</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
            <div className="text-sm font-bold uppercase tracking-wide text-stone-500">Business</div>
            <div className="mt-2 text-3xl font-bold text-stone-800">₹999<span className="text-base font-medium text-stone-400">/mo</span></div>
            <p className="mt-2 text-sm text-stone-600">Everything in Pro plus the Client Workbook and deadline reminders for your clients.</p>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-stone-600">
          Want it done for you? <strong>Filed For You</strong> — ₹4,999 per return, handled by an expert.{" "}
          <Link href="/pricing" className="font-semibold text-brand-700 underline hover:no-underline">See all plans →</Link>
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 pb-14">
        <h2 className="text-center text-2xl font-bold text-stone-800">Fair questions</h2>
        <div className="mt-6 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="rounded-xl border border-stone-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-stone-800">{q}</summary>
              <p className="mt-2 text-sm text-stone-600">{a}</p>
            </details>
          ))}
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "TaxSense AI",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            url: "https://taxsense.mnbresearch.com",
            description:
              "Conversational Indian income-tax copilot for FY 2025-26: both-regime computation with the working shown, Form 16/AIS import, ITR filing kit, planning calculators and a practice suite for CAs and lawyers.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
            author: { "@type": "Organization", name: "MNB Research", url: "https://mnbresearch.com" },
          }),
        }}
      />

      {/* Access CTA */}
      <section className="bg-brand-700">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          <h2 className="text-3xl font-bold text-white">Get your tax right — before the next deadline.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-brand-100">
            Start free in the app right now, or drop your email and we&apos;ll send your access details and deadline reminders.
          </p>
          <div className="mt-6">
            <RequestAccess />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="grid gap-8 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <div className="text-sm font-bold text-brand-700">TaxSense <span className="font-normal text-stone-400">AI</span></div>
              <p className="mt-2 text-xs text-stone-500">Indian income tax, worked out in one conversation. An MNB Research product, in collaboration with Abrobot.ai.</p>
              <p className="mt-2 text-xs font-semibold text-stone-600">Operated by ABROBOT TECHNOLOGIES PRIVATE LIMITED</p>
            </div>
            <FooterCol title="Product" links={[["/app", "Open the app"], ["/pricing", "Pricing"], ["/tools", "All tools"], ["/professional", "Professional Suite"], ["/whats-new", "What's new"]]} />
            <FooterCol title="Free help" links={[["/guide", "60-second Tax Guide"], ["/playbook", "Tax-Saving Playbook"], ["/deadlines", "Deadlines + reminders"], ["/learn", "Tax glossary"], ["/compare", "vs DIY portals & CAs"]]} />
            <FooterCol title="Company" links={[["https://www.mnbresearch.com/taxsense-ai", "About this product"], ["https://www.mnbresearch.com", "MNB Research"], ["/privacy", "Privacy"], ["/terms", "Terms"], ["/refund", "Refunds"]]} />
          </div>
          <div className="mt-8 border-t border-stone-100 pt-4 text-center text-xs text-stone-400">
            © 2026 ABROBOT TECHNOLOGIES PRIVATE LIMITED · TaxSense AI, an MNB Research product · Not a substitute for professional advice on complex matters.
          </div>
        </div>
      </footer>
    </main>
  );
}

const FAQ: [string, string][] = [
  ["How do I know the numbers are right?", "AI only reads your words; the tax itself is computed by a deterministic, section-cited engine — same input, same answer. It ships with 280+ automated checks against hand-computed cases (slabs, 87A with marginal relief, HRA Rule 2A, capital gains, 234 interest), runs a self-test on every deployment, and “Show the working” lets you verify every line."],
  ["Is my financial data safe?", "Saved profiles are protected by row-level security so only your login can read them; the 26AS reconciliation runs entirely in your browser; your data is never used to train AI. You can export everything or delete your account from the app — deletion completes after a 30-day grace period."],
  ["Can it file my return?", "TaxSense prepares everything — computation, regime choice, ITR form, document checklist, filing sheet and summary PDF. You (or your CA) file on the income-tax portal, or choose Filed For You and an expert handles it end to end. The ITR-1 JSON export is a draft for review, not a certified upload."],
  ["Who is it for?", "Salaried employees, freelancers and business owners (including presumptive 44AD/44ADA), investors and property sellers, NRIs checking residency, and the CAs, tax lawyers and students who work with them."],
  ["How does paying work?", "Most of TaxSense is free. Paid plans can be bought online by UPI, card or netbanking through Cashfree and activate automatically — or request a call and we set you up personally with a GST invoice. Cancel any time."],
  ["I missed the deadline — can it still help?", "Yes. The Filing Kit flags a belated return u/s 139(4), the late fee u/s 234F and 234A interest, and the deadline calendar shows what's still open for FY 2025-26."],
];

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">{title}</div>
      <div className="mt-2 flex flex-col gap-1.5 text-stone-600">
        {links.map(([href, label]) =>
          href.startsWith("http") ? (
            <a key={href} href={href} className="hover:text-brand-700">{label}</a>
          ) : (
            <Link key={href} href={href} className="hover:text-brand-700">{label}</Link>
          )
        )}
      </div>
    </div>
  );
}
