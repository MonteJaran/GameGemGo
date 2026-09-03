# Developer outreach — the offer, the email, the variants

Cold outreach asking small HTML5 game developers to put one
self-contained game into the GameGemGo feed, in exchange for a free
guaranteed-reach placement.

The lead list this is written for lives in `DEVELOPER_LEADS.md` next to
this file.

---

## Read this before you send anything

**The offer is a guarantee, and right now there is nothing behind it.**
"2,000 views, minimum 500 unique viewers" is a number you are promising to
a stranger. As of today the app is in `local_test` mode, Phase 2 isn't
deployed, there's no Play listing, and DAU is zero (see
`LAUNCH_CHECKLIST.md`). At 10 DAU, 500 *unique* viewers is roughly two
months of every single user seeing that one game. If you send this to 60
developers and 20 say yes, you have made 20 promises you cannot currently
keep, to exactly the group of people whose goodwill you need most — indie
game devs talk to each other, in public, on the same forums you'd want to
launch in.

Two ways to keep the offer and stay honest, both used in the template
below:

1. **State that it's early access and pre-launch, up front.** Not buried.
   Devs give a lot of slack to "I'm new, here's exactly where I am" and
   almost none to a claim that collapses on contact.
2. **Frame the number as a commitment with a make-good, not as a claim
   about existing reach.** "It stays in the feed until it has had 2,000
   impressions and 500 unique viewers, however long that takes, and if I
   ever pull it early I'll tell you and send you the numbers it did get."
   That is a promise you can keep at any DAU. "We'll get you 2,000 views"
   is not.

**Don't harvest emails from git commits.** Every public repo's commit
history exposes the author's email, and it is technically trivial to
scrape. Don't. Developers treat it as a spam vector, it's the fastest way
to get your domain reported, and for anyone in the EU an unsolicited
commercial email to a personal address they never published is exactly
what GDPR is about. Use the contact channel each person actually chose to
publish — that's what `DEVELOPER_LEADS.md` records.

**Basic compliance for the ones you do send:** real name and a real
identity in the signature (you're using a personal Gmail — say who you
are), a plain "reply 'no' and I won't contact you again" line, and honor
it. Send them one at a time, personalized. No BCC blasts, no mail-merge
tool — at this volume it's not worth it and it reads as spam instantly.

**Timing.** js13kGames 2026 (theme: Unicorns and Rainbows) closes
**13 September 2026** — ten days out. Most of the Tier B list below is
mid-jam right now and will ignore you. Wait for submissions to close, then
send in the week *after* the deadline, when people have a finished 13KB
game, no deadline left, and nothing to do but wait for voting. That is the
single best window in the year to ask this crowd for a game.

---

## What you're actually offering (keep these straight)

| | |
|---|---|
| Placement type | `featured` — curated, unpaid, plain framing |
| Cost to them | Nothing |
| Cost to you | Nothing (bundled or R2-hosted, ~$0 egress) |
| Exclusivity | None — they keep publishing anywhere else |
| Revenue share | None either way |
| What they get | Guaranteed reach + an aggregate performance readout |
| What you get | Catalog depth, and real games instead of placeholders |

This is *not* a promo placement. Don't mix the two in one email — promo is
prepaid and gold-framed, and offering both at once makes the free offer
read like a sales funnel.

---

## The email

Subject line — pick one, don't A/B test at this volume:

- `Your js13k game in a swipe-to-play Android feed (free, guaranteed reach)`
- `2,000 guaranteed plays for <GAME NAME> — free, no strings`
- `Can I put <GAME NAME> in front of 500+ people? (free placement)`

Body:

> Hi <NAME>,
>
> I played <GAME NAME> — <ONE SPECIFIC, TRUE SENTENCE ABOUT IT>. I'm
> building something it would fit into and I'd like to feature it, free.
>
> GameGemGo is an Android app that's a vertical swipe feed of playable
> games — no store page, no install, no Play button. The game is already
> running the moment its card reaches the top of the stack; you swipe up
> and the next one is running. Think short-form video, except every card
> is a real game you can play with your thumb.
>
> **The offer:** I put <GAME NAME> in the feed as a featured game, at no
> cost, and it stays there until it has had at least **2,000 impressions
> and 500 unique viewers**. No exclusivity, no revenue share, no rights
> asked for — you keep publishing it wherever you already do. Tapping the
> card opens whatever link you want (your itch page, your site, a store
> listing). If I ever have to pull it early I'll tell you and send you the
> numbers it did reach.
>
> **Being straight with you about where this is:** GameGemGo is
> pre-launch, in early access, and I'm one person building it. That's
> exactly why the offer is worded as "until it hits those numbers" rather
> than "in the first week" — hitting 500 unique viewers may take a while,
> and I'd rather tell you that now than have you find out later. If you'd
> rather wait until there's an install count to look at, that's completely
> fair — tell me and I'll come back to you when there is one.
>
> **What I'd need**, if you're in — and your game may already be there,
> given the size limit you built it under:
>
> - One self-contained `.html` file: CSS, JS and assets inlined, no
>   external requests (no CDN, no web fonts, no analytics)
> - Under 5MB hard, under 2MB strongly preferred — it downloads before
>   it's playable, so every megabyte is real waiting on a weak connection
> - It runs in `<iframe sandbox="allow-scripts">` with **no**
>   `allow-same-origin`, so `localStorage`, cookies and IndexedDB all
>   *throw* rather than fail quietly. If you save a high score, wrap it in
>   a try/catch with an in-memory fallback — that's usually the only
>   change a jam game needs
> - Touch input, portrait-friendly if possible (it's a phone, one thumb)
> - A title and the link a tap should open
>
> **What you get back:** an aggregate readout for your game — where in the
> playthrough people tend to skip, how many reach real engagement, average
> interactions before they leave, tap-through rate. Never anything tied to
> an individual person. It's genuinely useful for tuning an opening hook,
> and most jam games never get data like that at all.
>
> Details and the exact spec: https://<your-site>/advertise/
>
> If it's a no, just reply "no" and I won't contact you again.
>
> Thanks either way — <GAME NAME> deserved more players than a jam gives
> it.
>
> Dejan Radoman
> GameGemGo — dejanradoman00@gmail.com

### The one line that has to be real

`<ONE SPECIFIC, TRUE SENTENCE ABOUT IT>` is the whole email. If it could
be pasted into any other developer's email, you've written the wrong
sentence and they will know. Play the game for two minutes first and name
something only a player would notice:

- ✅ "the idle mode unlock that lets the flippers play themselves is a
  genuinely funny reward for winning"
- ✅ "scoring on the state of the world at the shutter instead of the
  pixels is a much better idea than it sounds like on paper"
- ❌ "great game, love the art style" (nothing, and reads as automated)

Never say "I love your work" about a person whose work you've seen one
piece of.

---

## Short variants

Most of the list has no published email. These are the same offer, cut to
fit the channel. Same rule: one true specific line first.

**GitHub issue on the game's repo** (title: `Feature <GAME> in GameGemGo?
(free placement)`) — public and permanent, so keep it clean and short.
This is the most reliable channel for the js13k crowd:

> Hi — I played <GAME> and <SPECIFIC THING>. I build GameGemGo, an Android
> swipe feed where each card is a playable game that's already running (no
> install, no Play button). I'd like to feature <GAME> free, guaranteed to
> stay up until 2,000 impressions / 500 unique viewers. No exclusivity, no
> revenue share, tap opens any link you choose.
>
> Full disclosure: it's pre-launch and I'm one person, so those numbers
> may take a while — that's why it's worded as "until it hits them."
>
> It needs one self-contained HTML file under 2MB running in
> `sandbox="allow-scripts"` (no `allow-same-origin`, so localStorage
> throws — a try/catch is usually the only change needed). Your entry is
> probably already 99% there.
>
> Interested? dejanradoman00@gmail.com — or just close this issue and I
> won't follow up.

**Bluesky / X / Mastodon DM** — under 300 characters, one ask, no pitch:

> Played <GAME> — <SPECIFIC THING>. I build GameGemGo, an Android swipe
> feed of instantly-playable games. Would you let me feature it free?
> Guaranteed 2,000 impressions / 500 unique viewers, no exclusivity, no
> rev share. Pre-launch and small, being upfront about that. Happy to send
> the details if you're curious.

**itch.io comment / devlog reply** — public, so no numbers-heavy pitch;
just open the door:

> <SPECIFIC THING ABOUT THE GAME>. I run a small Android app that's a
> swipe feed of playable games and I'd love to feature this one, free — no
> exclusivity or rev share. Is there somewhere I can send you the details?

---

## Follow-up

**One** follow-up, 7–10 days later, then stop. Never a third.

> Hi <NAME> — following up once on the free featured placement for
> <GAME NAME>, then I'll leave you alone. Still happy to do it whenever
> suits you, including months from now. If it's a no, no reply needed.
>
> Dejan

---

## Tracking

A spreadsheet is enough. Columns: developer, game, channel used, date
sent, date followed up, reply, outcome, and — the one that matters —
**impressions and unique viewers delivered so far**, because you've
promised each of them a specific number and you're the only one keeping
score. `firebase/scripts/creative-performance-report.mjs` produces the
per-creative side of that once Phase 2 is live.

Never contact anyone twice across two channels at once. An email *and* a
GitHub issue *and* a DM about the same game is the difference between
outreach and harassment.
