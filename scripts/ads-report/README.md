# Ads report → Notion

`sync-notion.mjs` pulls Meta and Google ad performance and writes it to two Notion databases:

| Database | One row per | What's in it |
|---|---|---|
| **Steady - Ads** | ad (Google: Search ad or PMax asset group) | Platform, campaign, ad set/group, status, launch and last-active dates, and lifetime totals: spend, impressions, clicks, quote starts, platform leads, real leads, spam taps, cost per real lead, jobs won, revenue. Also the linked Notion leads. |
| **Steady - Ad Weeks** | week (Mon–Sun) × platform (Meta / Google / All) | The same totals for that week, plus the week's best ad. |

The ad platforms are read-only. "Real leads", jobs won and revenue come from the **Steady - Offline Conversions** database, not from Meta or Google. That way bots and vendor pitches don't count as leads.

## How leads are matched to ads

Every website lead and tap row has a **Source / Campaign** value stamped from its UTMs:

- Google: `google / cpc · <campaign id> · term: <keyword> · ad: <ad id>`. Matched by ad ID. PMax is matched by campaign ID.
- Meta: `ig / paid_social · <campaign> · term: <ad set> · ad: <ad name>`. Matched by ad name. When several ads share a name, the stamped ad set wins, then whichever ad spent the most that week.

Lead counting:

- **Real lead:** any matched row that isn't *Spam / Invalid* and isn't an unresolved `Email tap ·` / `Phone tap ·` row.
- **Spam tap:** a *Spam / Invalid* row.
- **Jobs won** and **revenue:** rows marked *Finished*, using *Sold at*.

Leads with no ad stamp (organic, affiliate, past customers) aren't counted. Ad leads whose specific ad can't be identified still count in the weekly platform totals.

## Columns

The script overwrites its own columns on every run. It never changes **Creative**, **Verdict** or **Notes** after creating a row (new ads start with Verdict = *Testing*). Fill those in yourself.

"Quote starts" is Meta's `initiate_checkout` event, which the quote builder fires. It can fire more than once per visitor, so read it as a trend rather than a head count. Google has no equivalent, so the column is left at 0 for Google ads.

## Usage

```bash
node scripts/ads-report/sync-notion.mjs            # dry run: print totals, write nothing
node scripts/ads-report/sync-notion.mjs --setup    # add missing columns + create Steady - Ad Weeks
node scripts/ads-report/sync-notion.mjs --send     # write (runs --setup first)
```

Each run rewrites full history: Meta from 2026-02-23 and Google from 2026-06-22, the first campaign launch. Override with `ADS_META_SINCE` / `ADS_GOOGLE_SINCE`.

## Credentials

The script reads these from `scripts/meta-capi/.env.local` (git-ignored) or the shell:

- `NOTION_TOKEN`: the integration must have access to the page that holds the Ads and Offline Conversions databases.
- `META_ADS_READ_TOKEN`: a system-user token with only `ads_read`, from the "Steady Reporting" app in the Steady FNR business portfolio.
- `META_AD_ACCOUNT_ID`: the ad account ID, with or without `act_`.
- `GOOGLE_ADS_*`: the same credentials as `scripts/click-lookup` (see that README).
- Optional: `NOTION_ADS_DB_ID` and `NOTION_DATABASE_ID` (the Offline Conversions DB).
