# gclid → keyword lookup (Google Ads API)

Turn a single **gclid** (Google click id) into the **keyword / campaign / ad
group** that produced it. A gclid is an encrypted token — it can't be decoded
locally, and the Google Ads web UI has no per-gclid lookup. The Google Ads API's
`click_view` resource is the only way, and it keeps clicks for **~90 days**.

`lookup-gclid.mjs` is read-only — it queries Google Ads, never changes anything.
(The `enrich-notion.mjs` companion below writes results back to Notion, and only
with `--send`.)

```bash
node scripts/click-lookup/lookup-gclid.mjs --gclid EAIaIQ...BwE
```

By default it scans the last 10 days (one `click_view` query per day) until it
finds the click. Narrow or widen it:

```bash
node scripts/click-lookup/lookup-gclid.mjs --gclid EAIa...BwE --date 2026-10-26
node scripts/click-lookup/lookup-gclid.mjs --gclid EAIa...BwE --days 30
node scripts/click-lookup/lookup-gclid.mjs --gclid EAIa...BwE --json
```

It also prints the click's **approximate geography** (where the person was, and
the area their search was about). This is coarse by design — postal code / city /
metro / region / country, never a precise address.

**Keyword vs search term:** this returns the keyword you *bid on*, not the literal
query the person typed. For the actual query, use Google Ads → Insights &
reports → **Search terms**.

---

## Enrich Notion leads automatically

`enrich-notion.mjs` applies the same lookup across the whole Notion leads
database. Every website-form lead and anonymous tap row already stores its gclid
(the `Gclid` column); this finds rows that have a gclid but aren't enriched yet,
looks each one up, and writes the result back onto the row.

```bash
node scripts/click-lookup/enrich-notion.mjs            # DRY RUN (no writes), 25 rows
node scripts/click-lookup/enrich-notion.mjs --send     # actually write to Notion
node scripts/click-lookup/enrich-notion.mjs --limit 100 --send
node scripts/click-lookup/enrich-notion.mjs --days 30 --send   # wider date scan
```

It writes into these columns **if they exist**, otherwise it folds the value into
`Notes` (so you don't have to pre-create them, but adding them gives you
structured, filterable columns):

| Column | Example |
|---|---|
| `Keyword` | cable railing contractor |
| `Match type` | BROAD |
| `Campaign` | Cable and Guard Rail (Search) 7/7/26 |
| `Ad group` | Ad group 1 |
| `Ad network` | SEARCH_PARTNERS |
| `Click location` | 94124,California,United States (Postal Code) |

`Notes` always gets a one-line `Ad click → …` summary, which also marks the row
as enriched so re-runs skip it. Safe by default — **dry run unless you pass
`--send`**. Only rows with a real **gclid** resolve (gbraid/wbraid-only rows are
skipped — `click_view` keys on gclid). Needs `NOTION_TOKEN` plus the
`GOOGLE_ADS_*` credentials below.

**Keeping it hands-free:** run it on a schedule (e.g. a daily cron) so new tap /
form rows get enriched automatically within the 90-day `click_view` window:

```bash
# daily at 8am — enrich anything new from the last few days
0 8 * * *  cd /path/to/steadyfr && node scripts/click-lookup/enrich-notion.mjs --send >> /tmp/enrich.log 2>&1
```

---

## One-time setup (credentials)

> **What changed (Sep 2026):** Google **retired developer tokens**. Your API
> access level now rides on the **Google Cloud project** behind your OAuth
> client — not a token string. The old `developer-token` header is still accepted
> but ignored. Two new gotchas came with it: **brand verification** is required
> for new Basic/Standard access, and creating a **new OAuth refresh token now
> requires a passkey** on your Google account (a new passkey can take up to a
> week to become trusted). Existing refresh tokens keep working.

You need four values. Put them in `scripts/meta-capi/.env.local` (git-ignored,
same file the other scripts read) or export them in your shell:

```
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_REFRESH_TOKEN=...
GOOGLE_ADS_CUSTOMER_ID=123-456-7890      # your Ads account id (dashes ok)
# GOOGLE_ADS_LOGIN_CUSTOMER_ID=...        # only if the account is under an MCC/manager
# GOOGLE_ADS_API_VERSION=v26              # bump only if the API rejects the default
# GOOGLE_ADS_DEVELOPER_TOKEN=...          # legacy/optional — ignored since Sep 2026
```

Never commit these. The `.env.local` is already git-ignored.

### 1. Google Cloud project + Google Ads API access

Access now lives on the **Cloud project**, so this is the real gate.

1. **Google Cloud Console** → create or pick a project. *Remember which project
   it is* — the OAuth client in step 2 must live in this **same** project, or
   you'll be stuck at Test level.
2. **APIs & Services → Library** → enable the **Google Ads API**. Enabling it
   grants **Test access** only — which can't query your real account.
3. On the Google Ads API **Overview** page in Cloud Console, pick an access
   level for the project:
   - **Explorer** (recommended here) — **instant** production access, no brand
     verification. Capped at **2,880 operations/day** on production accounts, and
     blocks account creation / keyword planning / billing / user management. None
     of that affects this tool — a gclid lookup is a read-only report (~10 ops),
     well under the cap. This is the fast path.
   - **Basic** — 15,000 ops/day but now requires **brand verification** (slower),
     and pre-Sep-2026 pending applications were wiped. Only needed if you later
     build something higher-volume.
   Until the project has at least Explorer access, queries against your real
   account fail at Test level.

### 2. OAuth client (id + secret)

1. In the **same Cloud project**: **APIs & Services → OAuth consent screen** →
   set it up (External is fine; add yourself as a **Test user**).
2. **APIs & Services → Credentials → Create credentials → OAuth client ID** →
   application type **Desktop app**. Copy the **client id** and **client secret**.

### 3. Refresh token (passkey required)

Make sure the Google account has a **passkey** set up first (Google Account →
Security → Passkeys). Then the simplest path, no extra tooling — the **OAuth
Playground**:

1. Open <https://developers.google.com/oauthplayground>.
2. Gear (top right) → check **Use your own OAuth credentials** → paste your
   client id + secret.
3. Scope box: `https://www.googleapis.com/auth/adwords`
4. **Authorize APIs** → sign in with the account that has access to the Ads
   account (you may be prompted for the passkey) → allow.
5. **Exchange authorization code for tokens** → copy the **Refresh token** into
   `GOOGLE_ADS_REFRESH_TOKEN`. It's long-lived.

### 4. Customer id

Your Google Ads **account id**, top-right in the UI (format `123-456-7890`). The
script strips the dashes. If the account sits under a manager account, also set
`GOOGLE_ADS_LOGIN_CUSTOMER_ID` to the **manager's** id.

---

## Troubleshooting

- **`OAuth token exchange failed`** — client id/secret or refresh token is wrong,
  or the refresh token was made with different credentials. Regenerate step 3.
- **`permission denied` / Test-level / `developer token` errors** — the Cloud
  project behind your OAuth client doesn't hold Basic access yet, or the OAuth
  client lives in a *different* project than the one with access. Finish step 1
  and confirm the OAuth client is in that same project.
- **`User doesn't have permission` / `login-customer-id` errors** — the account
  is under a manager; set `GOOGLE_ADS_LOGIN_CUSTOMER_ID` to the manager id.
- **`invalid version` / 404** — bump `GOOGLE_ADS_API_VERSION` to the current
  Google Ads API version and retry.
- **`no click found`** — older than ~90 days, wrong day, the gclid is from a
  different account, or it's an App campaign click (gclid not exposed there). Try
  `--days 30` or an explicit `--date`.
