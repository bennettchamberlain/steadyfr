# Ad URL tagging (UTM parameters)

These are the tracking parameters configured in Google Ads and Meta so that ad
clicks arrive with campaign/ad info in the URL. The website captures them
(`frontend/lib/adClickIds.ts`), carries them on the contact and quote form
submissions, and writes them to Notion:

- `utm_*` → **Source / Campaign** column, e.g.
  `google / cpc · spring_railings · term: cable railing · ad: 678901234`
- `gclid` / `gbraid` / `wbraid` → **Gclid** column (auto-tagging)
- `fbclid` → **Meta click ID** column (auto-appended by Meta)

The click ids alone already tie a conversion to the exact ad inside the ad
platform; the UTMs surface the campaign, keyword (`utm_term`) and specific ad
(`utm_content`) directly in Notion so you can read them without logging in.

> These live in the ad platforms, not in code. This file is the record of what
> was set, so it can be checked or re-created later.

---

## Google Ads

**Final URL suffix** (Account level → Settings → Account settings → Tracking →
Final URL suffix). Use the suffix, not a tracking template, so auto-tagging
keeps adding `gclid`:

```
utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}
```

Notes:
- `{creative}` = the ad's numeric **ID** (Google doesn't expose the ad name in
  URLs). `{keyword}` = the keyword **text** (readable). `{campaignid}` = numeric.
- For **readable campaign names**, set the suffix **per campaign** and hardcode
  the name instead of `{campaignid}`:
  ```
  utm_source=google&utm_medium=cpc&utm_campaign=spring_railings&utm_content={creative}&utm_term={keyword}
  ```
- Keep **auto-tagging ON** (Account settings) so `gclid` is still appended — the
  suffix does not replace it.
- `utm_term` (`{keyword}`) is only meaningful on **Search** campaigns; it is
  blank on Display / Performance Max, and the Notion column just omits it.

## Meta (Facebook / Instagram)

**URL parameters** (Ad level → Tracking → URL parameters). `fbclid` is appended
by Meta automatically, so this only adds the UTMs:

```
utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}
```

Notes:
- `{{ad.name}}` and `{{campaign.name}}` return **readable names**, so the
  specific ad shows up as-is in Notion.
- To distinguish Facebook vs Instagram, swap `utm_source=facebook` for
  `utm_source={{site_source_name}}` (returns `fb` / `ig`).

---

## Verifying

1. Click a live ad, or append the params manually:
   ```
   https://www.steadyfnr.com/?utm_source=google&utm_medium=cpc&utm_campaign=test&utm_content=ad123&utm_term=cable+railing
   ```
2. Submit the contact or quote form.
3. Open that lead in Notion — **Source / Campaign** should read
   `google / cpc · test · term: cable railing · ad: ad123`.

The captured values persist for 90 days (last touch wins), so the tags from the
click that brought someone in still attach even if they submit the form on a
later visit.
