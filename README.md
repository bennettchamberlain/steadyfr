# STEADY FENCE AND RAIL
  a Superhot business

# Clean Next.js + Sanity app Template

https://template-nextjs-clean.sanity.dev

```shell
npm create sanity@latest -- --template sanity-io/sanity-template-nextjs-clean
```

#### 2. Run Studio and Next.js app locally

Navigate to the template directory using `cd <your app name>`, and start the development servers by running the following command

```shell
npm run dev
```

#### 2. Import Sample Data (optional)

You may want to start with some sample content and we've got you covered. Run this command from the root of your project to import the provided dataset (sample-data.tar.gz) into your Sanity project. This step is optional but can be helpful for getting started quickly.

```shell
npm run import-sample-data
```

Back in your Studio directory (`/studio`), run the following command to deploy your Sanity Studio.

```shell
npx sanity deploy
```

## Analytics & Tracking

This project includes comprehensive event tracking for both **Google Analytics 4** (GA4) and **Meta Pixel** (Facebook Pixel). All user interactions, clicks, and conversions are tracked across both platforms.

### Analytics Setup

- **Google Analytics ID**: `G-PV51QJQLR9`
- **Meta Pixel ID**: `767536079342741`

Both analytics platforms are automatically initialized on page load and track page views on route changes.

### Complete Event Tracking Reference

#### 📄 Page Views

| Event | Platform | Trigger | Parameters |
|-------|----------|---------|------------|
| `PageView` | Meta Pixel | Every page navigation | `content_name`, `page_path` |
| `page_view` | Google Analytics | Every page navigation | `page_title`, `page_location` |
| `quote_page_view` | Google Analytics | Landing on `/quote` page | `event_category: 'quote'`, `event_label: 'quote_page_visited'`, `page_path: '/quote'` |

#### 🧭 Navigation Events

| Event | Platform | Trigger | Parameters |
|-------|----------|---------|------------|
| `navigation_click` | Google Analytics | Internal link click | `event_category: 'navigation'`, `link_url`, `link_text` |
| `external_link_click` | Google Analytics | External link click | `event_category: 'navigation'`, `link_url`, `link_text` |
| `ViewContent` | Meta Pixel | Any link click | `content_name`, `content_category: 'Navigation'` or `'External Link'` |
| `cta_click` | Google Analytics | CTA button click (via TrackedLink) | `event_category: 'navigation'`, `link_url`, `link_text` |
| `InitiateCheckout` | Meta Pixel | CTA button click (via TrackedLink) | `content_name: 'Get a Quote'`, `content_category: 'Quote'` |

#### 📞 Contact Page Events

| Event | Platform | Trigger | Parameters |
|-------|----------|---------|------------|
| `contact_click` | Google Analytics | Email or phone link click | `event_category: 'contact'`, `event_label: 'email_click'` or `'phone_click'`, `contact_method`, `contact_value` |
| `Contact` | Meta Pixel | Email or phone link click | `content_name: 'Email Click'` or `'Phone Click'`, `content_category: 'Contact'`, `contact_method` |

#### 🖼️ Gallery Events

| Event | Platform | Trigger | Parameters |
|-------|----------|---------|------------|
| `gallery_project_click` | Google Analytics | Gallery project card click | `event_category: 'gallery'`, `event_label: projectName`, `project_id`, `project_location`, `project_categories` |
| `ViewContent` | Meta Pixel | Gallery project card click | `content_name: projectName`, `content_category: 'Gallery'`, `content_ids: [project._id]`, `content_type: 'product'` |
| `gallery_cta_click` | Google Analytics | "View Our Work" or "View All Projects" button | `event_category: 'navigation'`, `event_label: 'home_page_view_our_work'` or `'home_page_view_all_projects'` |

#### ⭐ Social Media Events

| Event | Platform | Trigger | Parameters |
|-------|----------|---------|------------|
| `external_link_click` | Google Analytics | Yelp reviews link click | `event_category: 'social'`, `event_label: 'yelp_reviews_click'`, `link_url` |
| `ViewContent` | Meta Pixel | Yelp reviews link click | `content_name: 'Yelp Reviews Click'`, `content_category: 'Social'`, `content_type: 'external_link'` |

#### 🎯 Quote Builder Events

##### Quote Initiation

| Event | Platform | Trigger | Parameters |
|-------|----------|---------|------------|
| `quote_started` | Google Analytics | Quote builder first loaded | `event_category: 'quote'`, `event_label: 'quote_builder_initiated'` |
| `InitiateCheckout` | Meta Pixel | Quote builder first loaded | `content_name: 'Railing Quote Builder'`, `content_category: 'Quote'` |
| `InitiateCheckout` | Meta Pixel | Landing on `/quote` page | `content_name: 'Quote Page'`, `content_category: 'Quote'` |

##### Step Navigation

| Event | Platform | Trigger | Parameters |
|-------|----------|---------|------------|
| `quote_navigation` | Google Analytics | Step back/next button click | `event_category: 'quote'`, `event_label: 'step_back'` or `'step_next'`, `from_step`, `to_step` |
| `ViewContent` | Meta Pixel | Step navigation | `content_name: 'Quote Step X'`, `content_category: 'Quote Navigation'`, `step` |
| `quote_step_completed` | Google Analytics | User progresses to new step | `event_category: 'quote'`, `event_label: 'step_X'`, `step_number`, `total_steps: 5` |
| `ViewContent` | Meta Pixel | Step completion | `content_name: 'Quote Step X'`, `content_category: 'Quote Progress'`, `step` |

##### Option Selections

| Event | Platform | Trigger | Parameters |
|-------|----------|---------|------------|
| `quote_option_selected` | Google Analytics | Any option selection (rail style, infill, picket style, railing end) | `event_category: 'quote'`, `event_label`, `option_type`, `option_value` |
| `ViewContent` | Meta Pixel | Any option selection | `content_name`, `content_category: 'Quote'`, `content_type`, `content_ids: [option_value]` |

**Option Types Tracked:**
- **Rail Style**: `victorian`, `rectangle`
- **Infill Type**: `none`, `pickets`, `ornamentalPickets`, `cable`, `slats`
- **Picket Style**: `straight`, `round`, `square`
- **Railing End**: `straight`, `foldDown`, `foldBack`, `none`

##### Section Management

| Event | Platform | Trigger | Parameters |
|-------|----------|---------|------------|
| `quote_section_added` | Google Analytics | Add section button click | `event_category: 'quote'`, `event_label: 'section_added'`, `total_sections` |
| `quote_section_removed` | Google Analytics | Remove section button click | `event_category: 'quote'`, `event_label: 'section_removed'`, `total_sections` |
| `quote_section_updated` | Google Analytics | Section length or type changed | `event_category: 'quote'`, `event_label: 'section_length_changed'` or `'section_type_changed'`, `section_id`, `length` or `section_type` |
| `ViewContent` | Meta Pixel | Section add/remove/update | `content_name: 'Section Added'` / `'Section Removed'` / `'Section Length Updated'` / `'Section Type Updated'`, `content_category: 'Quote'`, `total_sections` or `section_id` |

##### Form Field Interactions

| Event | Platform | Trigger | Parameters |
|-------|----------|---------|------------|
| `form_field_focus` | Google Analytics | Form field focused | `event_category: 'quote_form'`, `event_label: '{field}_field_focused'`, `field_name: 'name'` / `'email'` / `'zipcode'` |
| `form_field_interaction` | Google Analytics | Form field filled (value entered) | `event_category: 'quote_form'`, `event_label: '{field}_field_filled'`, `field_name` |
| `ViewContent` | Meta Pixel | Form field focus or fill | `content_name: '{Field} Field Focused'` or `'{Field} Field Filled'`, `content_category: 'Quote Form'`, `field_name` |

**Fields Tracked:** `name`, `email`, `zipcode`

##### Quote Submission (Conversion Events)

| Event | Platform | Trigger | Parameters |
|-------|----------|---------|------------|
| `quote_submit_button_clicked` | Google Analytics | Submit button clicked | `event_category: 'quote'`, `event_label: 'submit_button_clicked'`, `quote_value` |
| `conversion` | Google Analytics | Submit button clicked | `event_category: 'quote'`, `event_label: 'submit_button_clicked'`, `value`, `currency: 'USD'` |
| `InitiateCheckout` | Meta Pixel | Submit button clicked | `content_name: 'Quote Submit Button Clicked'`, `content_category: 'Quote'`, `value`, `currency: 'USD'` |
| `Lead` | Meta Pixel | Submit button clicked | `content_name: 'Quote Submit Initiated'`, `content_category: 'Quote'`, `value`, `currency: 'USD'` |
| `generate_lead` | Google Analytics | **CONVERSION** - Form submitted successfully | `value`, `currency: 'USD'`, `quote_style`, `quote_infill`, `quote_length`, `quote_total` |
| `purchase` | Google Analytics | **CONVERSION** - Form submitted successfully | `transaction_id`, `value`, `currency: 'USD'`, `items: [{item_id, item_name, item_category, price, quantity}]`, `quote_style`, `quote_infill`, `quote_length` |
| `quote_submitted` | Google Analytics | Form submitted successfully | `event_category: 'quote'`, `event_label: 'quote_form_submitted'`, `value`, `currency: 'USD'`, `quote_style`, `quote_infill`, `quote_length`, `quote_total` |
| `Lead` | Meta Pixel | **CONVERSION** - Form submitted successfully | `content_name: 'Railing Quote Request'`, `content_category: 'Quote'`, `value`, `currency: 'USD'`, `quote_value`, `style`, `infill`, `total_length` |
| `Purchase` | Meta Pixel | **CONVERSION** - Form submitted successfully | `content_name: 'Quote Completed'`, `content_category: 'Quote'`, `value`, `currency: 'USD'`, `quote_value` |
| `CompleteRegistration` | Meta Pixel | **CONVERSION** - Form submitted successfully | `content_name: 'Quote Form Completed'`, `value`, `currency: 'USD'` |

### Conversion Events Summary

**Primary Conversion Events** (automatically recognized by both platforms):

1. **Google Analytics:**
   - `generate_lead` - Standard GA4 conversion event
   - `purchase` - Standard GA4 e-commerce conversion event

2. **Meta Pixel:**
   - `Lead` - Standard Meta conversion event
   - `Purchase` - Standard Meta conversion event
   - `CompleteRegistration` - Standard Meta conversion event

**Conversion Tracking Flow:**
- **Intent Stage**: Submit button click fires `InitiateCheckout` (Meta) and `conversion` (GA)
- **Completion Stage**: Successful form submission fires all conversion events listed above

### Event Categories

All events are organized into the following categories:

- **Navigation**: Link clicks, CTA buttons
- **Contact**: Email/phone interactions
- **Gallery**: Project views and interactions
- **Quote**: All quote builder interactions
- **Quote Form**: Form field interactions
- **Social**: External social media links

### Implementation Notes

- All events fire on both Google Analytics and Meta Pixel simultaneously
- Page views are automatically tracked on route changes
- Conversion events include transaction values and quote details
- Form field interactions track both focus and fill events
- All quote builder option selections are individually tracked
- Navigation clicks are automatically captured via `NavigationTracker` component
