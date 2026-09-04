#!/usr/bin/env node
/**
 * Pure arithmetic — no Firebase, no network, safe to run any time. Two
 * planning questions, one script, because they're the same equation read
 * from opposite ends:
 *
 *   --budget  (demand side)  a sponsor hands you €X — how many clicks and
 *             engagements does that buy under a given rate card?
 *   --target  (supply side)  you want €X/day — how many DAU must the feed
 *             have to *produce* that many billable events?
 *
 * Both rest on `computeSpendCents` (functions/src/promoBilling.ts):
 * `clicks × perClickCents + engagements × perEngagementCents`. The two
 * counters accrue independently against the same prepaid balance, so every
 * answer here depends on the *ratio* between them, never on one alone.
 * Budget mode takes that ratio as a given (`--ratio`); target mode derives
 * it from the feed funnel, which is the honest way round once you know how
 * many games a user actually sees per day.
 *
 * See PROMO_PRICING_GUIDE.md for where the default rates come from, the
 * reasoning behind each funnel default, and the CPI sanity check that says
 * whether a rate card is one a sponsor will renew.
 *
 * This is reference/planning tooling for *setting* a rate card before a
 * campaign starts — not a replacement for promo-billing-report.mjs, which
 * reports what a *real* campaign has actually spent so far.
 *
 * Usage:
 *   node scripts/promo-pricing-calculator.mjs --budget=500
 *   node scripts/promo-pricing-calculator.mjs --budget=1000 --cpc=1.30 --cpe=0.25 --ratio=5
 *   node scripts/promo-pricing-calculator.mjs --target=50
 *   node scripts/promo-pricing-calculator.mjs --target=300 --games=20 --fill=0.4 --eng-rate=0.3 --ctr=0.05
 *
 * Flags (at least one of --budget / --target required; both may be given):
 *   --budget     prepaid amount, in the same currency as --cpc/--cpe
 *   --target     wanted revenue per day, same currency
 *   --cpc        cost per click (default 1.15 — see PROMO_PRICING_GUIDE.md)
 *   --cpe        cost per engagement (default 0.30)
 *   --ratio      budget mode only: assumed engagements per eventual click
 *                (default 4). Target mode derives this from --ctr instead.
 *   --games      target mode: games shown per user per day (default 20)
 *   --fill       share of those that are paid promo inventory (default 0.40)
 *   --eng-rate   share of paid cards reaching Level 3 (default 0.30 — see
 *                qualificationEngine.ts: 10s+ active, 2+ interactions)
 *   --ctr        outbound clicks per engaged session (default 0.05)
 *   --reject     share of billable events dropped by server-side
 *                requalification + fraud scoring (default 0.12)
 *   --cvr        click→install rate, for the CPI sanity check (default 0.25)
 *   --cpi        what an install is worth to the sponsor (default 2.00)
 */
function parseArgs(argv) {
  const out = {}
  for (const arg of argv) {
    // `[a-z][a-z-]*` so hyphenated flags (--eng-rate) parse; keys keep their
    // hyphen and are read via args['eng-rate'].
    const match = /^--([a-z][a-z-]*)=(.+)$/.exec(arg)
    if (match) out[match[1]] = Number(match[2])
  }
  return out
}

const USAGE =
  'Usage: node promo-pricing-calculator.mjs (--budget=<amount> | --target=<per-day>) ' +
  '[--cpc=1.15] [--cpe=0.30] [--ratio=4] [--games=20] [--fill=0.4] [--eng-rate=0.3] [--ctr=0.05] [--reject=0.12]'

const args = parseArgs(process.argv.slice(2))

/** A flag that was passed but isn't a usable positive number is a typo, not a request for the default. */
function num(name, fallback, { min = 0, max = Infinity } = {}) {
  const raw = args[name]
  if (raw === undefined) return fallback
  if (Number.isNaN(raw) || raw <= min || raw > max) {
    console.error(`--${name} must be a number in (${min}, ${max === Infinity ? '∞' : max}] — got "${raw}"`)
    process.exit(1)
  }
  return raw
}

const budget = args.budget === undefined ? null : num('budget', null)
const target = args.target === undefined ? null : num('target', null)

if (budget === null && target === null) {
  console.error(USAGE)
  process.exit(1)
}

const cpc = num('cpc', 1.15)
const cpe = num('cpe', 0.3)

function money(n) {
  return `€${n.toFixed(2)}`
}

/** Sub-cent amounts (ARPDAU, per-user install value) need more than 2 decimals to say anything. */
function fineMoney(n) {
  return `€${n.toFixed(4)}`
}

function pct(n) {
  return `${(n * 100).toFixed(0)}%`
}

if (budget !== null) {
  const ratio = num('ratio', 4)
  const costPerUnit = ratio * cpe + cpc // 1 click + `ratio` engagements
  const units = Math.floor(budget / costPerUnit)
  const clicks = units
  const engagements = units * ratio
  const spent = clicks * cpc + engagements * cpe
  const leftover = budget - spent

  console.log(`Budget: ${money(budget)}   Rate card: ${money(cpc)}/click, ${money(cpe)}/engagement   Assumed ratio: ${ratio} engagements per click`)
  console.log('')
  console.log(`  Projected clicks:       ~${clicks}`)
  console.log(`  Projected engagements:  ~${engagements}`)
  console.log(`  Spend at that mix:      ${money(spent)}  (${money(leftover)} left over — rate cards rarely divide budgets evenly)`)
  console.log('')
}

if (target !== null) {
  const games = num('games', 20)
  const fill = num('fill', 0.4, { max: 1 })
  const engRate = num('eng-rate', 0.3, { max: 1 })
  const ctr = num('ctr', 0.05, { max: 1 })
  const reject = args.reject === undefined ? 0.12 : num('reject', 0.12, { min: -1, max: 1 })
  const cvr = num('cvr', 0.25, { max: 1 })
  const cpi = num('cpi', 2)

  /**
   * One user's day, card by card. Only paid inventory bills at all — the
   * rest of the feed is unmonetized filler — and only events that survive
   * the server's own requalification reach `qualified_events`, so `reject`
   * is applied before any money is counted, not after.
   */
  function funnel(fillShare, engagedShare) {
    const paidCards = games * fillShare
    const engagements = paidCards * engagedShare * (1 - reject)
    const clicks = engagements * ctr
    return { paidCards, engagements, clicks, arpdau: engagements * cpe + clicks * cpc }
  }

  const f = funnel(fill, engRate)
  const dau = target / f.arpdau

  console.log(`Target: ${money(target)}/day   Rate card: ${money(cpc)}/click, ${money(cpe)}/engagement`)
  console.log(`Funnel: ${games} games/user/day, ${pct(fill)} paid inventory, ${pct(engRate)} reach Level 3, ${pct(ctr)} of those click out, ${pct(reject)} rejected server-side`)
  console.log('')
  console.log('  Per user, per day:')
  console.log(`    paid cards shown:     ${f.paidCards.toFixed(1)}`)
  console.log(`    billable engagements: ${f.engagements.toFixed(2)}`)
  console.log(`    billable clicks:      ${f.clicks.toFixed(3)}   (1 click per ~${Math.round(1 / f.clicks)} users)`)
  console.log(`    ARPDAU:               ${fineMoney(f.arpdau)}`)
  console.log('')
  console.log(`  DAU needed for ${money(target)}/day:  ~${Math.round(dau).toLocaleString('en-US')}`)
  console.log(`  Advertiser spend that implies:  ${money(target * 30)}/month across all live campaigns`)
  console.log(`  Implied engagements per click:  ~${(1 / ctr).toFixed(1)}  (feed this back as --ratio in budget mode)`)
  console.log('')

  // Fill rate and engagement rate are the two levers that don't require more
  // users, so show what moving them is worth before anyone goes and buys DAU.
  console.log('  DAU needed at other fill / engagement rates:')
  const fills = [0.25, 0.4, 0.6, 0.8]
  const engRates = [0.2, 0.3, 0.4]
  console.log(`    ${'fill \\ eng'.padEnd(12)}${engRates.map((e) => pct(e).padStart(9)).join('')}`)
  for (const fl of fills) {
    const cells = engRates.map((e) => Math.round(target / funnel(fl, e).arpdau).toLocaleString('en-US').padStart(9))
    console.log(`    ${pct(fl).padEnd(12)}${cells.join('')}`)
  }
  console.log('')

  /**
   * The check that decides whether a rate card survives renewal. A sponsor's
   * ceiling is what the traffic is worth to them — installs × CPI — not what
   * the rate card says. Charging well above it works exactly once: the
   * prepaid balance drains, the installs don't show up, and the campaign
   * doesn't come back. See PROMO_PRICING_GUIDE.md's "Is this rate card
   * renewable?" section.
   */
  const installValue = f.clicks * cvr * cpi
  const multiple = f.arpdau / installValue
  console.log(`  Sanity check — at ${pct(cvr)} click→install and ${money(cpi)} CPI, the sponsor gets ${fineMoney(installValue)} of install value per user/day,`)
  console.log(`  while this rate card charges ${fineMoney(f.arpdau)} — a ${multiple.toFixed(1)}× multiple.`)
  if (multiple > 3) {
    // Scale the whole card rather than solving for CPE alone: once the
    // multiple is this far out, the clicks by themselves can already exceed
    // the sponsor's ceiling, and "solve for CPE" then returns a negative
    // number instead of an answer.
    const scale = 2 / multiple
    console.log(`  >3× is not a renewable rate card. Scaled to ~2×, it reads ${money(cpc * scale)}/click + ${money(cpe * scale)}/engagement`)
    console.log(`  — which needs ~${Math.round(target / (f.arpdau * scale)).toLocaleString('en-US')} DAU for the same ${money(target)}/day.`)
  } else if (multiple < 0.7) {
    console.log('  Under 1× you are underselling the inventory — there is room to raise the rate card.')
  } else {
    console.log('  Roughly in the renewable band (~1–3× is normal for measurable performance inventory).')
  }
  console.log('')
}

console.log('This is a planning estimate, not a guarantee — real traffic will have its own funnel.')
console.log('Once a campaign is live, see promo-billing-report.mjs for what actually happened.')
