# Meta offline conversions (Conversions API)

The Meta counterpart to `scripts/offline-conversions/` (which feeds Google Ads).
When a lead becomes a **paying job**, this sends Meta a `Purchase` conversion so
Meta ads can optimize toward clicks that turn into real revenue — matched on the
contact info and Meta click id we already store on each lead in Notion.

> Only useful while **Meta ads are running.** The data is captured regardless, so
> you can send whenever a batch of jobs closes.

## One-time setup

1. **Access token.** Events Manager → your dataset (**Steady**, id
   `767536079342741`) → **Settings → Conversions API → Generate access token**.
   Keep it secret; it goes in `META_CAPI_TOKEN` (below), never in git.
2. Nothing to add in Notion — it reads the existing `Email`, `Phone`,
   `Meta click ID`, `IP address`, `User agent`, `Sold at`, `Sold on`, and
   `Lead Stage` columns.

## Each upload

1. In Notion, each closed job has **`Lead Stage` = `Finished`**, **`Sold at`**, and
   **`Sold on`** (same as the Google flow — one run feeds both).
2. From the repo root (`steadyfr/`), **dry run first** to see what it would send:
   ```bash
   NOTION_TOKEN=... node scripts/meta-capi/send-conversions.mjs
   ```
3. **Validate with Meta's Test Events** (Events Manager → Test Events → copy the
   `TEST…` code), so nothing hits real reporting until you're happy:
   ```bash
   NOTION_TOKEN=... META_CAPI_TOKEN=... \
     node scripts/meta-capi/send-conversions.mjs --test-event-code TESTxxxx --send
   ```
4. **Real send:**
   ```bash
   NOTION_TOKEN=... META_CAPI_TOKEN=... node scripts/meta-capi/send-conversions.mjs --send
   ```

## How it matches

Each `Finished` lead becomes a `Purchase` event (value = `Sold at`), matched on:
hashed **email** + hashed **phone** (SHA-256, normalized), the **`fbclid`** (as
Meta's `fbc`), and the **IP** + **user agent**. `event_id` = the Notion page id,
so re-sending the same lead de-dupes instead of double-counting.

## Notes & caveats

- **Attribution window is shorter than Google's.** Meta typically attributes
  offline conversions within ~28 days of the click (vs Google's 90) — so upload
  closed jobs promptly.
- Leads with no email/phone/fbclid are skipped (nothing to match on).
- `action_source` defaults to `physical_store` (an offline sale); override with
  `--action-source` if another value fits your sales flow better.
- Tokens (`NOTION_TOKEN`, `META_CAPI_TOKEN`) are read from the environment and the
  script is run by you locally — they never pass through Claude.
- Privacy: sending hashed customer data to Meta is covered by the `/privacy`
  policy's advertising/sharing sections (pending attorney review).
