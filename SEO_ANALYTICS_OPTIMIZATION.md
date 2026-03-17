# SEO & Analytics Optimization - Steady Fence & Railing

## Overview
Comprehensive SEO optimization for steadyfnr.com targeting the San Francisco Bay Area market with unified analytics tracking between Google Analytics and Facebook Pixel.

## Changes Implemented

### 1. **Structured Data (Schema.org)**
- Added `LocalBusinessSchema` component with full business information
- Schema type: `HomeAndConstructionBusiness`
- Geo-targeting: San Francisco Bay Area
- Area served: San Francisco, Oakland, San Jose, Berkeley, Palo Alto
- Service catalog: Stair railings, deck rails, guardrails, custom metalwork
- Opening hours, contact information, and aggregate ratings included

### 2. **Enhanced Metadata**
- **Keywords**: Comprehensive list of local and service-specific keywords
- **Geo-targeting**: Added geo meta tags (region, placename, position, ICBM)
- **Open Graph**: Complete OG tags for social media sharing
- **Twitter Cards**: Large image cards for Twitter sharing
- **Robots meta**: Optimized for maximum crawling and indexing
- **Canonical URLs**: Prevents duplicate content issues

### 3. **robots.txt**
- Created `/app/robots.ts` with proper crawl directives
- Allows all user agents
- Disallows sensitive paths (/api/, /studio/, /_next/)
- Sitemap reference included

### 4. **Unified Analytics Tracking**
- Created `UnifiedAnalytics.tsx` component
- Ensures identical events fire to both Google Analytics AND Facebook Pixel
- Pre-configured tracking functions for common events
- Event mapping:
  - **Quote Initiated**: `begin_checkout` (GA) → `InitiateCheckout` (Meta)
  - **Quote Submitted**: `generate_lead` (GA) → `Lead` + `Purchase` (Meta)
  - **Contact Clicked**: `contact_click` (GA) → `Contact` (Meta)
  - **Content Viewed**: `view_item` (GA) → `ViewContent` (Meta)

### 5. **Local SEO Focus**
Primary target keywords:
- fence installation San Francisco
- railing installation Bay Area
- stair railings San Francisco
- deck rails Oakland
- guardrails San Jose
- custom metalwork Berkeley
- metal fabrication Palo Alto

Service areas highlighted:
- San Francisco (primary)
- Oakland
- San Jose
- Berkeley
- Palo Alto
- Greater Bay Area

## Analytics Data Consistency

### Problem
Events showing in Google Analytics but not matching Facebook Pixel data, causing:
- Inaccurate conversion tracking
- Poor ROAS (Return on Ad Spend) measurement
- Difficulty optimizing ad campaigns

### Solution
**Unified tracking system** that sends identical events to both platforms simultaneously:

```typescript
// Example: Quote submission now tracks identically
unifiedTracking.quoteSubmitted({
  content_name: 'Railing Quote',
  value: estimatedPrice,
  currency: 'USD',
})
// ↓ Automatically sends:
// GA: generate_lead event with all params
// Meta: Lead event with standard params
// Meta: Purchase event for conversion tracking
```

### Benefits
1. **Consistent data** across both platforms
2. **Better conversion tracking** for Facebook Ads
3. **Easier debugging** - single source of truth
4. **Future-proof** - easy to add new platforms

## TODO: Required Actions

### 1. Update Contact Information (URGENT)
Edit `/app/components/LocalBusinessSchema.tsx`:
```typescript
telephone: '+1-XXX-XXX-XXXX', // ← Add real phone
email: 'info@steadyfnr.com',  // ← Verify email
```

### 2. Add Social Media Links
Add your social profiles to schema:
```typescript
sameAs: [
  'https://www.facebook.com/steadyfnr',
  'https://www.instagram.com/steadyfnr',
  'https://www.yelp.com/biz/steady-fence-and-railing',
]
```

### 3. Google Business Profile
- Claim/verify your Google Business Profile
- Use exact same NAP (Name, Address, Phone) as schema
- Add service areas: SF, Oakland, San Jose, Berkeley, Palo Alto
- Upload photos of completed projects
- Request reviews from satisfied customers

### 4. Google Search Console
- Verify property ownership
- Submit sitemap: `https://steadyfnr.com/sitemap.xml`
- Monitor for crawl errors
- Check search performance for target keywords

### 5. Analytics Verification
Test unified tracking is working:
```typescript
// Open browser console on live site:
import {checkAnalyticsStatus} from '@/app/components/UnifiedAnalytics'
checkAnalyticsStatus()
// Should show: {ga: true, meta: true}
```

### 6. Facebook Events Manager
- Verify events are now appearing
- Check that Lead and Purchase events match GA's generate_lead
- Set up conversion tracking for ad campaigns
- Test conversions API if available

## Expected Results

### SEO Improvements
- **Better local rankings** for "fence installation san francisco" and related terms
- **Rich snippets** in search results (business info, ratings, hours)
- **Higher CTR** from improved titles and descriptions
- **Mobile-friendly** structured data

### Analytics Improvements
- **Matching event counts** between GA and Facebook
- **Accurate conversion tracking** for ad campaigns
- **Better ROAS measurement**
- **Improved ad optimization** with consistent data

## Monitoring

### Week 1-2
- Check Google Search Console for indexing
- Verify analytics events are firing correctly
- Monitor Facebook Events Manager for data flow

### Month 1
- Track ranking improvements for target keywords
- Compare conversion data between GA and Facebook
- Analyze ad performance with new tracking

### Month 2-3
- Evaluate ROAS improvements
- Optimize content based on search queries
- Expand to additional service areas if performing well

## Files Changed

### New Files
- `/app/robots.ts` - Robots.txt for search engines
- `/app/components/LocalBusinessSchema.tsx` - Structured data for SEO
- `/app/components/UnifiedAnalytics.tsx` - Unified tracking system

### Modified Files
- `/app/layout.tsx` - Added schema, enhanced metadata
- `/app/page.tsx` - Enhanced homepage metadata with local keywords

## Resources

- [Google Business Profile](https://business.google.com/)
- [Google Search Console](https://search.google.com/search-console)
- [Facebook Events Manager](https://business.facebook.com/events_manager)
- [Schema.org Local Business](https://schema.org/LocalBusiness)
- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)

## Support

For questions or issues:
1. Check browser console for analytics errors
2. Use `checkAnalyticsStatus()` to verify tracking is loaded
3. Verify Facebook Pixel Helper extension shows events
4. Check Google Analytics Real-Time reports
