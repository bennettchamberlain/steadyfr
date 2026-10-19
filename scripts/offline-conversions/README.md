# Offline conversion uploads (Google Ads)

When someone clicks a Google ad, the website now captures their **gclid** (Google
click ID) and stores it on the lead in Notion (`Gclid` column, or inside *Notes*
as `gclid=…` if that column doesn't exist yet). This folder turns a list of
**closed** jobs back into a file you can upload to Google Ads, so Google learns
which clicks actually turned into paying work — your "offline conversions."

Online conversions (someone submitting the form) are already tracked by gtag.
This is only for the part that happens *off* the website: a lead that closes days
or weeks later by phone or in person.

---

## One-time setup in Google Ads

Do this once, so there's a conversion action for the upload to import into.

1. **Tools → Measurement → Conversions → + New conversion action**.
2. Choose **Import → Other data sources or CRMs → Track conversions from clicks**.
3. Name it exactly **`Website Lead (offline)`** (or pick your own name and pass
   it to the script with `--name`). The name in Google Ads and the name in the
   CSV must match.
4. Category: **Qualified lead** or **Purchase/Sale** — whichever matches how you
   think about a closed job. Value: **Use different values for each conversion**
   (the CSV carries a value per row).
5. Click-through conversion window: set it long enough to cover your sales cycle
   (e.g. 90 days — the website keeps a gclid for 90 days).
6. Save.

> gbraid / wbraid clicks (iOS / privacy-safe campaigns) can't go through this CSV
> — they need the Google Ads API. They're rare; the script lists any it skips.

---

## Each time you close some leads

1. Collect the closed jobs into a JSON file — see
   [`conversions.example.json`](./conversions.example.json). For each one you
   need:
   - `gclid` — copy from the lead's **Gclid** column in Notion (or the `gclid=…`
     text in its *Notes*). Skip leads that have no gclid; they didn't come from
     an ad click.
   - `closedAt` — when the job closed. An ISO timestamp
     (`2026-01-15T14:30:00-08:00`) or a bare date (`2026-01-15`) both work.
   - `value` — the sale amount (number, no `$`).
   - `currency` — optional, defaults to `USD`.

2. Build the CSV:

   ```bash
   node scripts/offline-conversions/build-conversions-csv.mjs my-closed-leads.json
   ```

   Options: `--out file.csv`, `--name "Website Lead (offline)"`,
   `--currency USD`, `--tz America/Los_Angeles`.

   Try it against the sample first:

   ```bash
   node scripts/offline-conversions/build-conversions-csv.mjs \
     scripts/offline-conversions/conversions.example.json --out /tmp/sample.csv
   ```

3. Upload: **Google Ads → Tools → Conversions → Uploads → Upload a file**,
   choose the generated CSV, **Preview** to check for errors, then **Apply**.

That's it. Google matches each gclid to the original click and attributes the
sale value back to the campaign/keyword that earned it.

---

## Want this automated?

Right now you hand the script a JSON file. It can instead pull closed leads
straight from Notion — I just need to know two things about your leads database:
which property marks a lead as **closed/won**, and which property holds the
**job value**. Tell me those and I'll add a `--from-notion` mode.
