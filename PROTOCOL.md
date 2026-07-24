# Urja Meter Ops — Protocol Notes

## Authentication
- Portal is built with SvelteKit + a library called better-auth.
- Login: `POST /login`
  - Body: `application/x-www-form-urlencoded`, fields `email`, `password`
  - On success: `200 OK`, sets cookie `__Secure-better-auth.session_token` (HttpOnly, Secure, SameSite=Lax, Max-Age=3600 — session lasts 1 hour)
- The portal rejects login requests that don't look like they came from a browser — a real browser sends `Origin`/`Referer`/`User-Agent` automatically, a script doesn't. Not sending these caused a `403`; adding them fixed it. Likely a CSRF-style protection.
- True session expiry (waiting a full hour) wasn't directly tested, but the client detects a 401/403 mid-session, re-logs in, and retries once.

## Data endpoints discovered (all JSON, all require the session cookie)
- `GET /portal/meters/search?q=&page=N` — paginated meter list. `q` filters by meter number or serial, and also works as an exact single-meter lookup (`q=J100000`). Returns `{ data: [...], total, page, pageSize }` — `pageSize` fixed at 20.
- `GET /portal/meters/{id}/energy` — full consumption history. Returns `{ data: [{ timestamp, kwh, kvah, voltR }] }`. `timestamp` is `"DD/MM/YYYY HH:mm"`, not ISO; `kwh`/`kvah`/`voltR` are strings, not numbers. Our client normalizes both.
- `GET /portal/dts?page=N` — paginated distribution transformer list (code, name, feeder, capacity in kVA).
- `GET /portal/meters/{id}/geo` — lat/lng for a meter. Discovered but not currently used by our API.

## Things that looked useful but weren't
- SvelteKit's own `__data.json?x-sveltekit-invalidated=...` requests fire on every page navigation but only ever return the logged-in user's own name/email — not meter data. A red herring.
- The meter detail page (HTML) shows a location hierarchy breadcrumb (Zone → Circle → Division → Subdivision → Substation → Feeder → DT). There is no JSON API behind it — it only exists in server-rendered HTML. We didn't scrape it (see README trade-offs).

## Quirks / anomalies
- `serialNo` formatting is inconsistent — some contain `&` instead of digits (e.g. `L&84997` next to `SE33962`). Treated as an opaque string, not parsed further.
- `kwh`/`kvah` are sometimes whole numbers with no decimal point (e.g. `"52370"`) — `Number()` handles this fine either way.# Urja Meter Ops — Protocol Notes

## Authentication
- Portal is built with SvelteKit + a library called better-auth.
- Login: `POST /login`
  - Body: `application/x-www-form-urlencoded`, fields `email`, `password`
  - On success: `200 OK`, sets cookie `__Secure-better-auth.session_token` (HttpOnly, Secure, SameSite=Lax, Max-Age=3600 — session lasts 1 hour)
- The portal rejects login requests that don't look like they came from a browser — a real browser sends `Origin`/`Referer`/`User-Agent` automatically, a script doesn't. Not sending these caused a `403`; adding them fixed it. Likely a CSRF-style protection.
- True session expiry (waiting a full hour) wasn't directly tested, but the client detects a 401/403 mid-session, re-logs in, and retries once.

## Data endpoints discovered (all JSON, all require the session cookie)
- `GET /portal/meters/search?q=&page=N` — paginated meter list. `q` filters by meter number or serial, and also works as an exact single-meter lookup (`q=J100000`). Returns `{ data: [...], total, page, pageSize }` — `pageSize` fixed at 20.
- `GET /portal/meters/{id}/energy` — full consumption history. Returns `{ data: [{ timestamp, kwh, kvah, voltR }] }`. `timestamp` is `"DD/MM/YYYY HH:mm"`, not ISO; `kwh`/`kvah`/`voltR` are strings, not numbers. Our client normalizes both.
- `GET /portal/dts?page=N` — paginated distribution transformer list (code, name, feeder, capacity in kVA).
- `GET /portal/meters/{id}/geo` — lat/lng for a meter. Discovered but not currently used by our API.

## Things that looked useful but weren't
- SvelteKit's own `__data.json?x-sveltekit-invalidated=...` requests fire on every page navigation but only ever return the logged-in user's own name/email — not meter data. A red herring.
- The meter detail page (HTML) shows a location hierarchy breadcrumb (Zone → Circle → Division → Subdivision → Substation → Feeder → DT). There is no JSON API behind it — it only exists in server-rendered HTML. We didn't scrape it (see README trade-offs).

## Quirks / anomalies
- `serialNo` formatting is inconsistent — some contain `&` instead of digits (e.g. `L&84997` next to `SE33962`). Treated as an opaque string, not parsed further.
- `kwh`/`kvah` are sometimes whole numbers with no decimal point (e.g. `"52370"`) — `Number()` handles this fine either way.