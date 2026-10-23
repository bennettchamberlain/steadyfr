# Google Customer Match list (from Notion)

Exports your leads/customers in Google Ads **Customer Match** format so you can
upload a list to Audience Manager. Google hashes the data on upload.

**What it's good for (for a one-time-purchase business like fencing):**
- **Retargeting** people who inquired but didn't book — show them ads to win them back.
- **Audience expansion** — seed Google's "find similar people" off your inquirers.
- **Exclusion** — stop paying to re-reach existing customers (minor for one-off work).

> It is **not** very useful for "optimize for new customers" bidding — you're
> almost all new customers anyway.

## ⚠️ The 100-member gate

A Customer Match list needs **~100 matched members** before Google lets you use
it in campaigns. Below that it won't activate. Your website leads live in Notion;
if that's under 100, pull in your **historical customers** (past jobs from
invoices / QuickBooks / email / phone contacts) to get there faster — add them to
Notion, or make a separate CSV in the same column format and upload both.

## Setup

- **`NOTION_TOKEN`** in the environment. The script also reads it from
  `scripts/meta-capi/.env.local` if you set that up, so you may not need to pass it.
- **Eligibility:** confirm Customer Match is available (Audience Manager → Segments
  → + → Customer list). Newer accounts sometimes need history first.
- **Privacy:** already disclosed in `/privacy` (Customer Match + hashed email/phone).

## Build the list

From the repo root (`steadyfr/`):
```bash
node scripts/customer-match/build-customer-list.mjs
```
- Exports **all** leads with an email or phone (de-duped). The output CSV is
  **git-ignored** — it contains customer PII, so it never gets committed.
- `--stage Finished` limits it to actual customers (sold jobs); omit for all leads.
- `--out path.csv` to choose the filename.

Output columns: `Email, Phone Number, First Name, Last Name, Country, Zip`
(plain text — Google normalizes and hashes on upload).

## Alternative: convert a spreadsheet directly (skip Notion)

If your past customers are already in a spreadsheet, you can turn it straight into
Customer Match format without importing to Notion. Export the sheet to CSV
(Sheets/Excel → Download/Save as CSV), then:
```bash
node scripts/customer-match/convert-sheet.mjs past-customers.csv --out customers.csv
```
It finds the **Name / Email / Phone** (and Zip, if present) columns by their
header — column order and extra columns don't matter — normalizes everything,
de-dupes, and drops rows with no email/phone. Upload the result as a **second
file** to the same Customer Match list, alongside the Notion export.

## Upload

Google Ads → **Audience Manager → Your data segments → + → Customer list** →
upload the CSV → accept the data-use terms. It takes 24–48h to match; once ≥100
members match, use the segment in campaigns (targeting / exclusion / expansion).

Refresh periodically (re-run + re-upload) as new leads come in.
