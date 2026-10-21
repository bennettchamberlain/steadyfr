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

3. Upload it (this account is **Data Manager**-only — see next section).

That's it. Google matches each gclid to the original click and attributes the
sale value back to the campaign/keyword that earned it.

---

## Uploading the file (Data Manager)

This account uploads through **Data Manager**, so the script writes that schema
by **default** — headers in row 1 and an ISO timestamp with a timezone offset
(no `Parameters:TimeZone` line). (For an older account that uses the classic
**Conversions → Uploads → Upload a file** page, add `--classic` to get that
format instead.)

Steps:
1. The offline conversion action must exist first (**Goals → Conversions → New →
   Import → Track conversions from clicks**). Its name must match `--name`.
2. Open its **Set up connection** / Data Manager flow → data source **File
   upload** → data **Conversions** → **offline conversions**.
3. **Select data:** upload the generated CSV.
4. **Map fields:** map the columns to Google's fields — `Google Click ID` → click
   id (gclid), `Conversion Time` → time, `Conversion Value` → value,
   `Conversion Currency` → currency (the action itself is already chosen, so
   `Conversion Name` can be left unmapped).
5. **Review** and finish. First successful upload activates the action;
   reporting shows within ~24h.

---

## Automated: pull straight from Notion

Instead of hand-building the JSON, the script can read the leads database
directly and pick the rows that are marked sold/won.

```bash
NOTION_TOKEN=... node scripts/offline-conversions/build-conversions-csv.mjs \
  --from-notion \
  --name "Converted lead (offline)" \
  --out /tmp/offline-conversions.csv
```

- Needs **`NOTION_TOKEN`** in the environment (the same token the website uses —
  it's in the app's env / Vercel project settings). `NOTION_DATABASE_ID` is
  optional; it defaults to the leads database.
- **`--name`**: must match your Google Ads offline conversion action (the
  "Import / Track conversions from clicks" one — see setup above).
- Defaults are set for this database, so you normally don't pass these:
  - `--won-stage "Finished"` — the **`Lead Stage`** value that means the job sold.
  - `--value-prop "Sold at"` — the sale amount (number).
  - `--date-prop "Sold on"` — the date used as the conversion time (falls back to
    the row's last-edited time if a row has no `Sold on` date).
  - `--stage-prop "Lead Stage"`, `--gclid-prop "Gclid"`, `--notes-prop "Notes"`.

The script reads `Sold at` as the conversion value and `Gclid` as the click id,
skips any won lead with no gclid (older leads, or gbraid/wbraid clicks that need
the API), and prints what it skipped and why. Review the CSV, then upload it via
Data Manager (see "Uploading the file" above).
