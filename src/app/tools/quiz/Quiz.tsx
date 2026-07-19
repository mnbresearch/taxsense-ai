"use client";

/** Batch 40 — scored tax-law quiz (free, students). */
import { useState } from "react";
import Link from "next/link";
import { QUIZ } from "@/lib/quiz";

export default function Quiz() {
  const [picked, setPicked] = useState<(number | null)[]>(QUIZ.map(() => null));
  const [done, setDone] = useState(false);

  const answered = picked.filter((p) => p !== null).length;
  const score = picked.reduce((acc: number, p, i) => acc + (p === QUIZ[i].answer ? 1 : 0), 0);

  function grade(): string {
    const pct = score / QUIZ.length;
    if (pct >= 0.9) return "Senior counsel material 🥇";
    if (pct >= 0.7) return "Ready for the tax bench 🥈";
    if (pct >= 0.5) return "Solid junior — keep reading 🥉";
    return "The bare Act awaits 📖";
  }

  function share() {
    const text = `I scored ${score}/${QUIZ.length} on the TaxSense AI tax-law quiz (${grade().replace(/[^\w\s-]/g, "").trim()}). Try beating me: https://taxsense-ai.vercel.app/tools/quiz`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <Link href="/professional" className="text-xs font-semibold text-brand-700">← Professional Suite</Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-800">The Tax-Law Quiz</h1>
        <p className="mt-2 text-sm text-stone-600">
          12 questions pulled from real practice — FY 2025-26 positions. Answers cite the section, so every
          miss is a 30-second lesson.
        </p>
      </header>

      <div className="space-y-5">
        {QUIZ.map((item, qi) => {
          const p = picked[qi];
          return (
            <div key={qi} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="text-sm font-semibold text-stone-800">
                <span className="mr-1.5 text-stone-400">{qi + 1}.</span>{item.q}
              </div>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {item.options.map((opt, oi) => {
                  let cls = "border-stone-200 bg-stone-50 hover:border-brand-600";
                  if (done || p !== null) {
                    if (oi === item.answer) cls = "border-green-500 bg-green-50";
                    else if (p === oi) cls = "border-red-400 bg-red-50";
                    else cls = "border-stone-200 bg-stone-50 opacity-60";
                  }
                  return (
                    <button
                      key={oi}
                      disabled={done || p !== null}
                      onClick={() => setPicked(picked.map((x, i) => (i === qi ? oi : x)))}
                      className={"rounded-lg border px-3 py-2 text-left text-sm text-stone-700 transition " + cls}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {(p !== null || done) && (
                <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
                  <strong>s.{item.sec}:</strong> {item.explain}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-4 mt-8 rounded-xl border border-brand-200 bg-white p-4 shadow-lg">
        {!done ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-600">{answered}/{QUIZ.length} answered · running score {score}</span>
            <button
              onClick={() => setDone(true)}
              disabled={answered < QUIZ.length}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              Finish
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-bold text-brand-700">{score}/{QUIZ.length} — {grade()}</div>
              <div className="text-xs text-stone-500">Every explanation above is now visible — worth a scroll.</div>
            </div>
            <div className="flex gap-2">
              <button onClick={share} className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                Share on WhatsApp
              </button>
              <Link href="/tools/sections" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                Study the sections →
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
