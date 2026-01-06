# SendGrid Consumption Model Datasheet

## Associated SaaS
**SendGrid (Twilio Email API)**

## Type
**Partial SaaS**  
(Usage governed by subscription plan + email volume rather than pure pay-per-request)

---

## (*) Pricing Configurations

### Capacity (Quota)
- **Email send volume is plan-based**
  - Free tier: ~100 emails/day
  - Paid tiers: higher monthly email caps (varies by contract)
- No single global daily API quota documented for paid plans
- Practical limits are enforced via:
  - Account plan
  - Sender reputation
  - Internal SendGrid throttling

### Auto-Recharge
- **Not applicable**
- Quotas reset per billing cycle (monthly or daily for free tier)
- No automatic quota top-ups

### Extra Charge
- **Yes, under approval**
  - Exceeding free or plan limits requires upgrading the plan
  - No pay-as-you-go overage for email sends without plan changes

---

## Max Power (Rate Limit)

### Rate Limiting Behavior
- SendGrid uses standard HTTP **429 Too Many Requests**
- Rate-limited responses may include:
  - `X-Ratelimit-Limit`
  - `X-Ratelimit-Remaining`
  - `X-Ratelimit-Reset`
- Limits are **endpoint-specific**

### Mail Send Endpoint (`/v3/mail/send`)
- Very high throughput supported
  - Up to **10,000 requests/second**
  - Each request may include up to **1,000 recipients**
- Rate-limit headers are not always returned for mail/send,
  but throttling can still occur

### Other Endpoints
- Lower and stricter limits (varies by API)
- Typically return rate-limit headers consistently

---

## Per-Request Cost
- **1 API request = 1 send operation**
- A single request can include multiple recipients
- Cost is **not per request**, but per email volume allowed by plan

---

## Cooling Period
- Determined by `X-Ratelimit-Reset`
  - Unix timestamp indicating when requests may resume
- Client should back off and retry after reset time
- Cooling behavior depends on endpoint and usage pattern

---

## Segmentation
- **By endpoint**
  - `mail/send` vs activity, suppression, stats APIs
- **By account / plan**
  - Free vs paid tiers
- **By API key**
  - All keys under the same account share limits

---

## Shared Limits
- **Yes (TBD)**
- Limits are shared across:
  - Endpoints
  - API keys belonging to the same SendGrid account

