# Reflection

**What assumptions did you make?**
I assumed the portal's `search` endpoint could double as a single-meter lookup since there was no separate endpoint for it, and that a 401/403 mid-session meant the session had expired and a fresh login would fix it (I couldn't wait a full hour to test true expiry, but it's reasonable given the cookie's 1-hour Max-Age).

**Which part was the most difficult, and how did you get unstuck?**
Login kept failing with a 403 even though the email/password and payload format matched DevTools exactly. It turned out the portal likely checks `Origin`/`Referer`/`User-Agent` headers, which a browser sends automatically but a script doesn't. Adding those headers explicitly fixed it.

**If you had another day, what would you improve?**
I'd build the full network hierarchy reconstruction (scraping the breadcrumb off each meter's detail page) and add a caching layer, since consumption history payloads are large and don't need to be fetched fresh on every single request.

**What mistake did you make while solving this (there's always one)?**
I initially placed `openapi.json` one folder level too high (outside the project instead of next to `package.json`), which crashed the server with a "module not found" error until I moved it into the right place.

**If you were reviewing your own submission, what would you criticise?**
There's no automated testing at all, and the hierarchy/caching extensions are missing. Under time pressure I prioritized a correct, well-documented core over breadth, but a reviewer would fairly flag the lack of tests as a gap.