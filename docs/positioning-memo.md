# TaxSense AI — Market & Positioning Memo (Session 6)

*Researched 6 July 2026. Sources: ClearTax, TaxBuddy, Quicko public pricing/comparison pages; incometax.gov.in; incometaxindia.gov.in.*

## The landscape

**ClearTax** — the incumbent. DIY self-filing product plus CA-assisted plans; individual DIY plans start around ₹2,150, CA-assisted roughly ₹999–2,999. Strengths: 300+ income types, 80+ broker integrations for capital gains, crypto exchange partnerships. Weakest UX point: it is still fundamentally a *form* — a long, intimidating wizard, with aggressive upsells layered on top.

**TaxBuddy** — the value CA-assisted player. Salaried plans from ~₹999/yr (multiple-property ₹1,099, business ₹2,499), with post-filing notice support included in every plan — its real differentiator. Weakest UX point: no proper DIY product; everything routes through a human queue, so speed depends on their CA capacity in peak season.

**Quicko** — the trader's choice. Zerodha-partnered, clean API-first design, the natural home for F&O/capital-gains filers. Weakest UX point: narrower audience; a salaried-plus-rent user gets less hand-holding.

All three share one structural weakness: **intake is the product's worst moment.** Every one of them eventually shows the user a giant form or asks them to upload documents into a queue. Nobody has made *telling your situation to the product* the product.

## Where an AI-native product has a real wedge

1. **Conversational intake as the moat-shaped feature.** "I make around 80k a month, pay 25k rent in Pune, put 1.5L in PPF" is a complete data-entry event in TaxSense; in every competitor it's 15 form fields across 4 screens.
2. **Quantified advice, not just computation.** Competitors tell you your tax; TaxSense tells you the ranked list of legal moves and the exact ₹ each one saves (what-if engine). That is the screenshot people share.
3. **The regime decision is the anxiety.** Post-Budget-2025, "old vs new" is THE question every salaried Indian asks. Making that the hero — transparent, auditable, section-cited math under both regimes — matches the moment.

## What TaxSense AI should NOT compete on

- **E-filing rails.** Do not build ITR e-filing/ERI integration in v1 — that is ClearTax's fortress (integrations, compliance ops, support). Output a filing-ready summary the user can execute on the government portal or hand to a CA in minutes.
- **Broker integrations.** Quicko owns the Zerodha pipe. Accept a pasted/uploaded P&L summary instead.
- **Human CA marketplaces / notice support.** TaxBuddy's ops-heavy game. Position CAs as complementary, not replaced.
- **Price.** Free/cheap won't differentiate in a market where DIY filing is already near-free. Differentiate on the experience.

## The one differentiated claim

> **"The only tax tool you talk to — it finds the regime and the deductions that save you the most, and shows you the math."**

Everything in the product should defend that sentence: conversational intake, both-regime transparency, ₹-quantified moves, auditable computation notes on the PDF.

## Verified FY 2025-26 figures used by the rules engine

- New regime slabs: 0–4L nil / 4–8L 5% / 8–12L 10% / 12–16L 15% / 16–20L 20% / 20–24L 25% / 24L+ 30%; standard deduction ₹75,000; 87A rebate up to ₹60,000 (income ≤ ₹12L) with marginal relief above; surcharge capped at 25%.
- Old regime: slabs unchanged (2.5L/5L/10L; senior 3L, super-senior 5L basic exemption); standard deduction ₹50,000; 87A ₹12,500 (≤ ₹5L); surcharge up to 37%.
- Capital gains (post 23-Jul-2024, unchanged FY 2025-26): STCG 111A 20%; LTCG 112A 12.5% above ₹1.25L exemption; other LTCG 12.5% no indexation.
- Caps: 80C ₹1.5L; 80CCD(1B) ₹50k; 80D ₹25k/₹50k (senior); 80CCD(2) 10%/14% of basic+DA (old/new); 24(b) SOP ₹2L; HP loss set-off ₹2L; cess 4%.

Sources: [Income Tax Dept — AY 2026-27](https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1) · [87A rebate FY 2025-26](https://www.incometaxindia.gov.in/w/what-is-rebate-under-section-87a-for-f.y-2025-26-and-who-can-claim-it-) · [ClearTax slabs](https://cleartax.in/s/income-tax-slabs) · [Tax2win CG rates](https://tax2win.in/guide/capital-gain-tax-in-india-ltcg-stcg) · [TaxBuddy vs ClearTax](https://www.taxbuddy.com/blog/taxbuddy-vs-cleartax-comparison-review) · [ClearTax vs Quicko](https://cleartax.in/s/cleartax-vs-quicko-comparison)
