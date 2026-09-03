# Hosting playable creatives on Cloudflare R2

Where the actual `.html` bytes for a `kind: 'remote'` playable (network,
promo, or featured) live. Nothing in the app cares *where* `playable.entry`
points — `playableCache.ts` just `fetch()`s whatever URL is in that field —
so this is purely a hosting decision, no code change required to adopt it.

**Why R2, not Firebase Storage**: R2 charges **$0 for egress, always** — the
only thing that scales with how many users download your creatives. Firebase
Storage (and S3/GCS) bill per-GB downloaded, which is the one cost that
actually grows with your DAU. R2 storage itself is $0.015/GB-month (first
10GB free) — for a folder of self-contained HTML playables that's cents.

## One-time setup

1. Sign up free at [cloudflare.com](https://cloudflare.com) (no card needed
   for the free tier).
2. Dashboard → **R2** → **Create bucket**. Name it `gamegem-playables`.
3. Give it a public URL — two options:
   - Fastest: bucket **Settings → Public access → Allow Access**, which
     turns on a free `pub-<hash>.r2.dev` URL immediately. Fine for testing.
   - Cleaner for production: **Settings → Custom Domains → Connect Domain**,
     e.g. `games.gamegemgo.com` (needs that domain's DNS on Cloudflare, or a
     CNAME if you're using Cloudflare DNS already).
4. **CORS** (do this even though the app falls back gracefully without it):
   bucket **Settings → CORS Policy** → allow `GET` from `*` — these are
   public ad creative files with no auth requirement, so a wildcard is fine.
   Without this, `playableCache.ts`'s background `fetch()` prefetch/cache
   step fails silently and every card falls back to a live `<iframe src>`
   load instead (still works, just no offline caching benefit — see that
   file's own comment on the failsafe).
5. Install the CLI: `npm install -g wrangler`, then `wrangler login`
   (opens a browser to authorize once).

## Uploading a playable

```bash
wrangler r2 object put gamegem-playables/playables/<placement>/<creativeId>/index.html \
  --file=./path/to/the-game.html \
  --content-type=text/html
```

`--content-type=text/html` matters — without it R2 may serve the file as
`application/octet-stream`, which some browsers won't render inline as HTML.

**Key naming convention** (not enforced by code, just keep it consistent so
the bucket stays browsable):

```
playables/network/<creativeId>/index.html
playables/promo/<creativeId>/index.html
playables/featured/<creativeId>/index.html
```

The resulting public URL — `https://games.gamegemgo.com/playables/featured/
featured-fortress-siege/index.html` (or the `.r2.dev` equivalent) — is
exactly what goes in `playable.entry` when you add or edit the Firestore
`ad_creatives` doc (via `addPromoGame` for a promo, or however you add a
network/featured doc — see `firebase/FIREBASE_SCHEMA.md`).

## Updating a creative already live

Re-run the same `wrangler r2 object put` command with the same key — it
overwrites in place. Cloudflare's edge cache may keep serving the old bytes
for a few minutes; purge instantly from the dashboard (**Caching → Configuration
→ Purge Everything**, or purge just that URL) if you need the change live
immediately.

## Cost at scale

Rough planning number: 1000 DAU, ~20 new-to-that-device creatives seen per
month, ~2MB average file size ≈ 40GB/month of downloads. On R2 that's **$0**
in egress, plus a few cents/month in storage. The same 40GB on Firebase
Storage's Blaze plan (~$0.15/GB) would run roughly $6/month — still cheap,
just not the same "flat $0 no matter how big this gets" property R2 has.
