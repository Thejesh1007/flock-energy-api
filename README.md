# Flock Energy — Urja Meter Ops API

A clean, documented REST API wrapper around the legacy "Urja Meter Ops" portal, built for the Flock Energy engineering take-home.

## What this is
The Urja Meter Ops portal has no API — only a browser UI. This service logs into the portal behind the scenes, talks to its internal (undocumented) JSON endpoints, cleans up the data (proper number types, ISO timestamps), and re-exposes it as a small, well-documented REST API.

## How it's structured
flock-energy-api/
├── src/
│ ├── app.js # Express app, mounts routes + Swagger docs
│ ├── server.js # Entry point — starts the HTTP server
│ ├── config.js # Reads environment variables
│ ├── urjaClient.js # The only file that talks to the legacy portal
│ └── routes.js # Our clean /api/v1/... REST routes
├── openapi.json # OpenAPI 3.0 spec for OUR api
├── PROTOCOL.md # How the legacy portal actually works
├── REFLECTION.md # Reflection questions
└── README.md # You are here
`urjaClient.js` is the adapter layer — the only file that knows about the portal's login flow, cookies, and internal endpoints. Everything else only ever talks to `urjaClient`, never to the portal directly.

## Setup & running
1. `npm install`
2. Create a `.env` file in the project root:

PORT=4000
PORTAL_BASE_URL=https://urja-ops.flockenergy.tech
PORTAL_USERNAME=operator@urja.local
PORTAL_PASSWORD=urja-ops-2026

3. `npm run dev` (or `npm start`)
4. Server runs at `http://localhost:4000`

## Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/meters?q=&page=` | List/search meters |
| GET | `/api/v1/meters/:id` | Single meter details |
| GET | `/api/v1/meters/:id/consumption` | Consumption history (normalized) |
| GET | `/api/v1/transformers?page=` | List distribution transformers |
| GET | `/docs` | Interactive Swagger UI |
| GET | `/openapi.json` | Raw OpenAPI spec |
| GET | `/health` | Health check |

Authentication with the portal is fully automatic — there's no login endpoint on our API, since the service holds its own credentials (in `.env`) and manages its own session with the portal internally.

## Sample request
```bash
curl http://localhost:4000/api/v1/meters/J100000/consumption
```
```json
{
  "meterId": "J100000",
  "readings": [
    { "timestamp": "2026-06-23T23:30:00.000Z", "kwh": 48438.74, "kvah": 52313.84, "voltageR": 226 }
  ]
}
```

## Assumptions
- The portal's `search` endpoint doubles as a single-meter lookup (search by exact meter ID) since there's no dedicated single-meter JSON endpoint.
- Session lifetime is 1 hour (from the cookie's `Max-Age`); the client re-authenticates automatically on a 401/403 rather than pre-emptively refreshing.
- One shared session/client per running instance is enough here — no multi-tenancy needed, since we were only given one operator account.

## Design decisions & trade-offs
- **Node/Express** over Python — the stack I'm most comfortable in; the task explicitly says framework choice isn't judged.
- Kept the "legacy client" and "API routes" cleanly separated (adapter pattern) so the messy parts of dealing with the portal don't leak into the rest of the app.
- Data normalization (string numbers → real numbers, `DD/MM/YYYY HH:mm` → ISO timestamps) happens once, in the client, so every route gets clean data for free.
- No database/caching layer — every request hits the portal live. Simple and correct for a 403-meter dataset in a 4-6 hour exercise; see below for where this would start to matter.

## What I intentionally left out
- **Network hierarchy** (optional extension) — the Zone→Circle→...→DT breadcrumb only exists in server-rendered HTML, not any JSON API. Scraping it for all 403 meters felt like more complexity/fragility than the time budget allowed. The `dtCode` on each meter plus `/portal/dts` is enough to group meters by transformer, just not the full multi-level tree.
- **Caching/freshness layer** — skipped for time.
- **The `geo` (lat/lng) endpoint** — discovered but not wired in, since it wasn't part of the core spec.
- **A web client** — optional extension, skipped for time.

## What I'd improve with more time
- A thin caching layer (e.g. cache meter list for ~1 minute) — consumption history in particular is a heavy payload and doesn't change every second.
- The local index/query layer extension — at 403 meters this API doesn't struggle, but at 10,000+ meters, filtering across attributes beyond ID/serial would need real indexing, not just proxying every request through.
- Basic tests around `urjaClient`'s data normalization (timestamp parsing, number coercion) — the part most likely to silently break if the portal's format changes.
- Properly reconstruct the network hierarchy by scraping the meter detail page, with caching.

See [`PROTOCOL.md`](./PROTOCOL.md) for how the portal works, and [`openapi.json`](./openapi.json) / `/docs` for the full API spec.

## Reflection