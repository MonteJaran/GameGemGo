# Promo pricing reference (for later — nothing here is wired into any code)

Reference material for setting a promo campaign's rate card
(`rateCardCents.perClickCents` / `perEngagementCents`, see
`firebase/FIREBASE_SCHEMA.md`'s promo section and `addPromoGame`) — what
the market generally charges, and a calculator to turn a prepaid budget
into "roughly how many clicks/engagements does this buy." Written now so
it's ready **when you're actually pricing a real campaign** — nothing here
runs automatically, nothing here is read by the app or Cloud Functions.

## Industry benchmark anchors (2026)

No GameGemGo traffic exists yet to measure real numbers from (still
`local_test`, not deployed — see `LAUNCH_CHECKLIST.md`), so these are
published industry figures for comparable formats, not your own data:

| Metric | Range | Source |
|---|---|---|
| In-app CPC, entertainment/gaming-adjacent verticals | **$1.15 – $1.40** per click | [Google Ads Benchmarks 2026 — Digital Applied](https://www.digitalapplied.com/blog/google-ads-benchmarks-2026-cpc-ctr-cvr-industry) |
| Mobile CPI (cost per install), Android | **$1.92 – $2.97** average, regional range $0.50–$5.00 | [Game Growth Advisor — 2026 CPI Benchmarks](https://gamegrowthadvisor.com/blog/2026-03-17-user-acquisition-cpi-benchmarks-2026/) |
| Rewarded video eCPM | **$15–$40** (tier-1: US/UK/JP), **$3–$10** (tier-2/3) | [Playio — Rewarded Ad Benchmarks 2026](https://blog.playio.co/rewarded-ad-benchmarks-2026) |
| Playable ads vs. standard video | **20–30% lower CPI** — playables pre-qualify interest before the click | [Playio — Rewarded Ad Benchmarks 2026](https://blog.playio.co/rewarded-ad-benchmarks-2026) |

**Cost per engagement (CPE) isn't a commonly published metric** the way
CPC/eCPM are — an "engagement" here (qualification Level 3: 10s+ active,
2+ interactions, see `qualificationEngine.ts`) is a much lower bar than an
outbound click, so it should price well under CPC. Absent a direct
benchmark, a reasonable derived range is **1/3 to 1/6 of CPC** — roughly
**€0.20–€0.45/engagement** if CPC is ~€1.00–€1.30. The existing example
seed doc (`firebase/seed/ad_creatives.sample.json`) uses €1.00/click,
€0.50/engagement — a bit above this derived range, which is fine as a
round starting number, just know it's on the generous side for the
sponsor relative to the CPC anchor above.

**Rewarded-video eCPM → cost-per-view**, for context if you ever add a
CPM-style tier: eCPM ÷ 1000 = **$0.015–$0.04/view** (tier-1),
**$0.003–$0.01/view** (tier-2/3).

## The calculator

A promo campaign's spend is `computeSpendCents` (`functions/src/
promoBilling.ts`): `clicks × perClickCents + engagements × perEngagementCents`
— both counters accrue independently against the same prepaid balance, so
"how far does €X go" depends on the *ratio* of engagements to clicks your
feed actually produces, not just one or the other in isolation.

`scripts/promo-pricing-calculator.mjs` projects this: give it a budget, a
rate card, and an assumed engagements-per-click ratio (default 4:1 — i.e.
"for every eventual outbound click, expect ~4 qualified engagements along
the way" — adjust once you have real funnel data), and it prints the
projected totals and how many days a given daily reach might take to
exhaust the balance.

```bash
node firebase/scripts/promo-pricing-calculator.mjs --budget=500
node firebase/scripts/promo-pricing-calculator.mjs --budget=1000 --cpc=1.30 --cpe=0.25 --ratio=5
```

### Worked examples (mid-range rates: €1.15/click, €0.30/engagement, 4:1 ratio)

| Prepaid budget | Projected clicks | Projected engagements |
|---:|---:|---:|
| €100 | ~42 | ~168 |
| €500 | ~212 | ~848 |
| €1,000 | ~425 | ~1,700 |
| €5,000 | ~2,127 | ~8,508 |

(Generated with the script above at its default rates — re-run it if you
change `--cpc`/`--cpe`/`--ratio`, this table is a snapshot, not live.)
