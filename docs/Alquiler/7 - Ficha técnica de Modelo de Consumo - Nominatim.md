# Nominatim (OpenStreetMap) Consumption Model Datasheet

## Associated SaaS

**OpenStreetMap – Nominatim API**  
(Official public geocoding service provided by the OpenStreetMap Foundation)

## Type

**Public API / Partial SaaS**  
(Open data service, free to use but governed by strict usage policies rather than commercial contracts)

---

## (\*) Pricing Configurations

### Capacity (Quota)

- **No explicit numeric quota published**
- Usage is governed by the official Nominatim Usage Policy
- Practical limits are enforced via:
  - Per-IP rate limiting
  - Fair-use rules
  - Manual or automatic blocking on abuse
- Heavy, batch, or commercial usage is **not allowed** on the public instance

Reference policy:  
https://operations.osmfoundation.org/policies/nominatim/

### Auto-Recharge

- **Not applicable**
- No quota replenishment mechanism
- Service availability is continuous but subject to policy enforcement

### Extra Charge

- **No**
- Public instance is free of charge
- For higher capacity or commercial usage:
  - Self-hosted Nominatim is required
  - Or use third-party commercial providers

---

## Max Power (Rate Limit)

### Rate Limiting Behavior

- Rate limiting is enforced per IP address
- Typical recommended limit:
  - **~1 request per second**
- Bursts are discouraged and may lead to blocking
- Rate limiting is not always communicated via headers

### Throttling

- Implemented using server-side controls
- Sliding window behavior (exact window not publicly specified)
- Excessive usage may result in:
  - Temporary throttling
  - Temporary or permanent IP bans

---

## Per-Request Cost

- **Free**
- No monetary cost per request
- Cost is instead measured in:
  - Resource usage
  - Compliance with fair-use policy

---

## Cooling Period

- **Not explicitly defined**
- If rate-limited or blocked:
  - Cooling period is determined by the server
  - May range from minutes to permanent bans
- No `Retry-After` guarantee

---

## Segmentation

- **By service type**
  - Search (`/search`)
  - Reverse geocoding (`/reverse`)
  - Lookup (`/lookup`)
- **By deployment**
  - Public shared instance
  - Self-hosted instance
- **By IP**
  - Limits apply per source IP

---

## Shared Limits

- **Yes**
- Limits are shared across:
  - All users of the public Nominatim instance
  - All requests originating from the same IP
- No isolation between applications using the same IP
