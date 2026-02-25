# Meta Pixel Event Tracking Guide

## Understanding `__missing_event` in Facebook Pixel

The `__missing_event` error appears in Facebook Pixel's Recent Activity when:
1. **Custom events are used** that aren't registered in Facebook Events Manager
2. **Events fire before the pixel is fully loaded**
3. **Non-standard parameters** are used with standard events
4. **Standard events are misused** (e.g., using `ViewContent` for form interactions)

## Standard Facebook Pixel Events Used

Our implementation uses the following **standard Facebook Pixel events**:

### ✅ Standard Events (Automatically Recognized)

1. **`PageView`** - Automatic page view tracking
   - Fires automatically on route changes
   - No custom parameters needed

2. **`ViewContent`** - Content viewing events
   - Used for: Gallery project views, option selections, step navigation
   - Standard parameters: `content_name`, `content_category`, `content_ids`, `content_type`

3. **`InitiateCheckout`** - User starts checkout/quote process
   - Used for: Quote builder initiation, quote page visits, submit button clicks
   - Standard parameters: `content_name`, `content_category`, `value`, `currency`

4. **`Lead`** - Lead generation conversion
   - Used for: Quote form submissions (primary conversion event)
   - Standard parameters: `content_name`, `content_category`, `value`, `currency`

5. **`Purchase`** - Purchase/conversion completion
   - Used for: Completed quote submissions
   - Standard parameters: `content_name`, `content_category`, `value`, `currency`

6. **`CompleteRegistration`** - Form completion
   - Used for: Quote form submissions
   - Standard parameters: `content_name`, `value`, `currency`

7. **`Contact`** - Contact initiation
   - Used for: Email/phone link clicks
   - Standard parameters: `content_name`, `content_category`

## Events Removed to Prevent `__missing_event`

The following events were **removed** from Meta Pixel tracking (still tracked in Google Analytics):

- ❌ Form field focus events
- ❌ Form field fill events  
- ❌ Section add/remove/update events

**Reason**: These aren't standard Facebook events and were causing `__missing_event` errors. They're still fully tracked in Google Analytics for detailed analysis.

## Best Practices

1. **Use standard events** whenever possible
2. **Limit custom parameters** to standard event parameters only
3. **Focus Meta Pixel on conversion events** - use GA for detailed interaction tracking
4. **Ensure pixel loads before tracking** - events queue automatically if pixel isn't ready

## Current Meta Pixel Event Flow

### Quote Process:
1. **Initiation**: `InitiateCheckout` (quote builder loaded, quote page visit)
2. **Progress**: `ViewContent` (step navigation, option selections)
3. **Completion**: `Lead`, `Purchase`, `CompleteRegistration` (form submission)

### Contact:
- `Contact` (email/phone clicks)

### Gallery:
- `ViewContent` (project card clicks)

## Troubleshooting `__missing_event`

If you still see `__missing_event`:

1. **Check Events Manager**: Go to Facebook Events Manager → Events → Verify all events are standard events
2. **Check timing**: Ensure events aren't firing before pixel loads (our code handles this automatically)
3. **Verify parameters**: Only use standard parameters for each event type
4. **Custom events**: If using custom events, register them in Events Manager first

## Standard Event Parameters Reference

### ViewContent
- `content_name` (string)
- `content_category` (string)
- `content_ids` (array)
- `content_type` (string)
- `value` (number)
- `currency` (string)

### Lead
- `content_name` (string)
- `content_category` (string)
- `value` (number)
- `currency` (string)

### Purchase
- `content_name` (string)
- `content_category` (string)
- `content_ids` (array)
- `value` (number)
- `currency` (string)

### Contact
- `content_name` (string)
- `content_category` (string)

### InitiateCheckout
- `content_name` (string)
- `content_category` (string)
- `value` (number)
- `currency` (string)

### CompleteRegistration
- `content_name` (string)
- `value` (number)
- `currency` (string)
