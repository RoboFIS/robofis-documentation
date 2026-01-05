# OpenRouteService – Consumption Model Datasheet (Standard Plan)

## Associated SaaS
**OpenRouteService (Heidelberg Institute for Geoinformation Technology – HeiGIT)**

---

## Type
**Partial SaaS (Quota-based, API Key–governed)**  
(Usage governed by daily and per-minute limits per endpoint; not pay-per-request)

---

## Pricing Configurations (*):
3 (https://account.heigit.org/info/plans)


## Pricing Configuration — Standard Plan

### Capacity (Quota)

The **Standard plan** is **free of charge** and designed for development, testing, CI/CD pipelines, and MVP environments.

Limits are applied **per endpoint**, expressed as:

> **(daily limit / per-minute limit)**

#### Routing & Analysis
- **Directions V2**: 2,000 / 40
- **Matrix V2**: 500 / 40
- **Isochrones V2**: 500 / 20
- **Snap V2**: 2,000 / 100
- **Optimization**: 500 / 40

#### Elevation
- **Elevation Line**: 200 / 40
- **Elevation Point**: 2,000 / 100

#### Geocoding
- **Geocode Search**: 1,000 / 100
- **Geocode Reverse**: 1,000 / 100
- **Geocode Autocomplete**: 1,000 / 100

#### Points of Interest
- **POIs**: 500 / 60

Quotas **reset daily** and are strictly enforced.

---

### Auto-Recharge
- **Not available**
- No automatic quota top-ups
- Consumption is blocked until the next daily reset

---

### Extra Charge
- **No**
- The Standard plan does not allow overage
- Higher consumption requires:
    - Applying for an upgraded plan, or
    - Migrating to a self-hosted solution

---

## Max Power (Rate Limit)

### Rate Limiting Behavior
- The service returns **HTTP 429 – Too Many Requests**
- Throttling occurs when exceeding:
    - Per-minute limits
    - Daily endpoint quotas

### Granularity
- **Endpoint-specific**
- Each API has its own counters
- No documented global rate-limit bucket

---

## Per-Request Cost
- **€0**
- No per-request pricing
- Usage is constrained exclusively by assigned quotas

---

## Cooling Period
- Implicitly determined by:
    - **1-minute windows** (rate limits)
    - **Daily quota reset**
- After a 429 response:
    - Clients should apply backoff strategies
    - Retry after the appropriate interval

---

## Segmentation
- **By endpoint**
    - Directions, Matrix, Isochrones, Geocoding, etc.
- **By API Key**
    - All requests using the same key share quotas
- **By plan**
    - Standard vs Collaborative vs On-Premise

---

## Shared Limits
- **Yes**
- All requests issued with the same **API Key** share the same quotas
- No isolation by IP address or consuming application

