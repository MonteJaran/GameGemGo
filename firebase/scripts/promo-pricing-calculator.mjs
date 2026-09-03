#!/usr/bin/env node
/**
 * Pure arithmetic — no Firebase, no network, safe to run any time. Projects
 * how far a prepaid promo budget goes under a given rate card, using an
 * assumed engagements-per-click ratio (a promo campaign's spend accrues
 * both counters independently — see functions/src/promoBilling.ts's
 * computeSpendCents — so "how far does €X go" depends on that ratio, not
 * clicks or engagements alone). See PROMO_PRICING_GUIDE.md for where the
 * default rates come from and the reasoning behind the ratio assumption.
 *
 * This is reference/planning tooling for *setting* a rate card before a
 * campaign starts — not a replacement for promo-billing-report.mjs, which
 * reports what a *real* campaign has actually spent so far.
 *
 * Usage:
 *   node scripts/promo-pricing-calculator.mjs --budget=500
 *   node scripts/promo-pricing-calculator.mjs --budget=1000 --cpc=1.30 --cpe=0.25 --ratio=5
 *
 * Flags (all optional except --budget):
 *   --budget   prepaid amount, in the same currency as --cpc/--cpe (required)
 *   --cpc      cost per click (default 1.15 — see PROMO_PRICING_GUIDE.md)
 *   --cpe      cost per engagement (default 0.30)
 *   --ratio    assumed engagements per eventual click (default 4)
 */
function parseArgs(argv) {
  const out = {}
  for (const arg of argv) {
    const match = /^--([a-z]+)=(.+)$/.exec(arg)
    if (match) out[match[1]] = Number(match[2])
  }
  return out
}

const args = parseArgs(process.argv.slice(2))

if (!args.budget || Number.isNaN(args.budget) || args.budget <= 0) {
  console.error('Usage: node promo-pricing-calculator.mjs --budget=<amount> [--cpc=1.15] [--cpe=0.30] [--ratio=4]')
  process.exit(1)
}

const budget = args.budget
const cpc = args.cpc && !Number.isNaN(args.cpc) ? args.cpc : 1.15
const cpe = args.cpe && !Number.isNaN(args.cpe) ? args.cpe : 0.3
const ratio = args.ratio && !Number.isNaN(args.ratio) ? args.ratio : 4

const costPerUnit = ratio * cpe + cpc // 1 click + `ratio` engagements
const units = Math.floor(budget / costPerUnit)
const clicks = units
const engagements = units * ratio
const spent = clicks * cpc + engagements * cpe
const leftover = budget - spent

function money(n) {
  return `€${n.toFixed(2)}`
}

console.log(`Budget: ${money(budget)}   Rate card: ${money(cpc)}/click, ${money(cpe)}/engagement   Assumed ratio: ${ratio} engagements per click`)
console.log('')
console.log(`  Projected clicks:       ~${clicks}`)
console.log(`  Projected engagements:  ~${engagements}`)
console.log(`  Spend at that mix:      ${money(spent)}  (${money(leftover)} left over — rate cards rarely divide budgets evenly)`)
console.log('')
console.log('This is a planning estimate, not a guarantee — real traffic will have its own ratio.')
console.log('Once a campaign is live, see promo-billing-report.mjs for what actually happened.')
