# LinkedIn launch post (Session 8)

---

Filing taxes in India has a strange property: the *math* is deterministic, but the *experience* is anxiety.

Old regime or new? Is my HRA exemption right? Did I just lose ₹15,000 by not topping up NPS in time?

So I built **TaxSense AI** — the newest MNB Research product, alongside AbroBot and NyayaAI.

It's an income-tax copilot you *talk to*. No 40-field form. You say "I make around 80k a month, pay 25k rent in Pune, put 1.5L in PPF" — and it structures that, computes your liability under BOTH regimes for FY 2025-26, and shows the exact section-wise math. Not a black box: every rule is cited, 87A marginal relief and all.

Then the part I'm proudest of: the what-if engine. It doesn't just compute your tax — it ranks the legal moves you haven't made, in rupees. "₹50,000 into 80CCD(1B) saves you ₹15,600." Ranked by savings-per-rupee.

At the end you get a filing-ready PDF: income breakdown, both-regime comparison, recommendation, and the exact document checklist for your situation.

How it works:
1. Talk — describe your income the way you'd tell a friend
2. See — both regimes computed transparently, deduction gaps quantified
3. File — walk away with a summary you can file from, or hand to your CA

And that last point matters: this is built to work *with* CAs, not against them. It does the tedious 90% — intake, regime math, document prep — so the professional review starts from a clean file. Many of you reading this ARE the finance professionals I want feedback from.

Engineering notes for the curious: the rules engine is a pure-function TypeScript module with 40+ unit tests hand-verified against the FY 2025-26 provisions; the conversational layer runs on Groq for sub-second turns with a Claude fallback; the data layer is Postgres with row-level security because your income details are nobody else's business — including mine (the admin dashboard only ever sees aggregates).

Beta is free. Break it, and tell me how.

#BuildInPublic #IncomeTax #AI #India #TaxSeason #MNBResearch

---

*(Alternative shorter hook, if the above runs long for your audience: "Every Indian taxpayer makes one ₹30,000 decision a year without realising it: old regime or new. I built an AI you can talk to that makes it with you — and shows the math.")*
