import type { Metadata } from "next";
import Link from "next/link";
import { DEADLINES } from "@/lib/deadlines";
import RemindMe from "./RemindMe";

export const metadata: Metadata = {
  title: "Income-Tax Deadlines FY 2025-26 / AY 2026-27 — Advance Tax & ITR Dates | TaxSense AI",
  description:
    "Every income-tax due date for FY 2025-26: all four advance-tax installments, the 31 July ITR deadline, audit and belated-return dates — with free email reminders 7 days and 1 day before each.",
};

export const revalidate = 3600;

function daysLeft(date: string): number {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  now.setHours(0, 0, 0, 0);
  return Math.round((new Date(date + "T00:00:00").getTime() - now.getTime()) / 86400000);
}

export default function DeadlinesPage() {
  return (
    <main>
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-bold text-brand-700">TaxSense <span className="font-normal text-stone-400">AI</span></Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/pricing" className="text-stone-600 hover:text-brand-700">Pricing</Link>
          <Link href="/app" className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">Open the app</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 pb-20 pt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Compliance calendar</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight">Every income-tax deadline. <br className="hidden sm:block" />Never in your head again.</h1>
        <p className="mt-4 max-w-2xl text-stone-600">
          FY 2025-26 / AY 2026-27 due dates, kept current. Add your email below and TaxSense AI nudges you
          <strong> 7 days and 1 day before</strong> every date — free.
        </p>

        <div className="mt-10 space-y-3">
          {DEADLINES.map((d) => {
            const left = daysLeft(d.date);
            const past = left < 0;
            return (
              <div key={d.date + d.label} className={"flex items-center gap-4 rounded-xl border p-4 " + (past ? "border-stone-200 bg-stone-50 opacity-60" : left <= 30 ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white")}>
                <div className="w-24 flex-none text-center">
                  <div className="text-xl font-bold text-brand-700">{new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                  <div className="text-[11px] uppercase text-stone-500">{new Date(d.date + "T00:00:00").getFullYear()}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{d.label}</div>
                  <p className="text-sm text-stone-600">{d.detail}</p>
                </div>
                <div className="flex-none text-right text-xs font-semibold">
                  {past ? <span className="text-stone-400">passed</span> : <span className={left <= 30 ? "text-amber-700" : "text-stone-500"}>{left === 0 ? "TODAY" : `${left} days`}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-brand-100 bg-brand-50/60 p-6 text-center">
          <h2 className="text-xl font-bold">Get nudged before every date</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-600">One email, 7 days out. One more the day before. Nothing else, ever.</p>
          <div className="mt-4"><RemindMe /></div>
        </div>

        <p className="mt-8 text-center text-sm text-stone-500">
          Not sure what you owe by these dates?{" "}
          <Link href="/app" className="font-semibold text-brand-700 underline">Compute it in one conversation →</Link>
        </p>
      </section>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-8 text-center text-sm text-stone-500">
          © {new Date().getFullYear()} MNB Research · TaxSense AI · Dates per the Income-tax Act, 1961; verify against official notifications.
        </div>
      </footer>
    </main>
  );
}
