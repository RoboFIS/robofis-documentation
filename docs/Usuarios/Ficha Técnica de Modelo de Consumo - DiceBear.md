# DiceBear – Consumption Model Datasheet (Public HTTP API)

## Associated SaaS

**DiceBear** (Florian Körner & Contributors)
*Note: This datasheet applies to the public hosted instance (`api.dicebear.com`).*

## Type

**Public Utility / Open Source SaaS**
(Usage governed by "Fair Use" policy and strict throttling per IP; no authentication required)

---

## Pricing Configurations (*)

**1** (Free / Donation-supported)

### Pricing Configuration — Public Instance (Free)

#### Capacity (Quota)

* **Unlimited Total Volume** (subject to Fair Use)
    * There is no monthly or daily "hard cap" on the number of requests, provided the rate limits (requests per second) are respected.
* **Commercial Use Restriction**
    * The public API (`api.dicebear.com`) requests non-commercial usage to conserve bandwidth.
    * For commercial production environments, **Self-Hosting** is the required "upgrade" path (Docker/Node.js).

#### Auto-Recharge

* **Instant**
    * Quotas are based on a sliding second window.
    * Consumption capacity restores immediately once the request rate drops below the threshold.

#### Extra Charge

* **No**
    * There is no "pay-per-request" model.
    * Exceeding limits simply results in dropped requests (HTTP 429).
    * Scaling beyond these limits requires migrating to a self-hosted instance (free software, own infrastructure cost).

---

### Max Power (Rate Limit)

#### Rate Limiting Behavior

* The service returns **HTTP 429 – Too Many Requests**.
* Limits are strictly enforced **per second** to prevent abuse.

#### Throughput Limits (per IP address)

 * **SVG Formats:** ~50 requests / second
* **Raster Formats (PNG/JPG/WebP/AVIF):** ~10 requests / second
    * *Note: Raster generation consumes significantly more CPU, hence the stricter limit.*

#### Per-Request Cost

* **€0**
    * The service is entirely free of charge.

#### Cooling Period

* **Client-Side Caching (Crucial)**
    * The API relies heavily on HTTP Caching to reduce load.
    * Standard responses include `Cache-Control: max-age=...` or `immutable`.
    * **Recommendation:** Clients should cache generated avatars indefinitely (or for long periods) based on the URL seed.

#### Segmentation

* **By IP Address**
    * Rate limits are applied per originating IP.
    * No API Keys or Account IDs are used for segmentation.
* **By File Format**
    * Distinct limit buckets for Vector (SVG) vs. Raster (PNG, etc.).

#### Shared Limits

* **Global Infrastructure**
    * The public API runs on shared infrastructure (sponsored by bunny.net).
    * Performance may fluctuate based on global traffic, though the CDN mitigates most latency.