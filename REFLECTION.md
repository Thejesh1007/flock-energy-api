
# Implementation Reflection

## What assumptions did you make?

- I treated the portal's meter-search endpoint as the source for individual meter details because it supports searching by meter ID. The API checks the returned records for an exact `meterId` match before returning a meter.
- I assume timestamps from the portal that do not specify a timezone represent UTC. This makes normalization deterministic across machines, but the portal's actual timezone should be verified before using the values for billing or other timezone-sensitive decisions.
- I treat an upstream portal failure as a gateway error rather than returning the portal's response directly. This keeps the public API's error behavior more consistent.

## What was the most difficult part?

Authentication was the most difficult part. The portal returned `403` responses even when the credentials and form payload matched the browser's request. Adding browser-like `Origin`, `Referer`, and `User-Agent` headers resolved the issue in testing.

The adapter also needs to maintain the portal session cookie and recover from authentication failures. The client retries a request once after reauthentication, rather than retrying indefinitely.

## What did you implement?

- An Express REST API for meter search, individual meter details, consumption history, and transformer listings.
- A separate portal client that owns authentication and upstream HTTP requests.
- Environment-based configuration for the server port, portal URL, credentials, and request timeout.
- Normalization of numeric readings and timestamps.
- Centralized JSON error handling.
- OpenAPI documentation and an interactive Swagger UI.
- Automated unit tests for numeric and timestamp normalization.

## What remains incomplete?

- **Caching:** repeated requests can fetch the same data from the portal again.
- **Geolocation:** the portal exposes a meter geolocation endpoint, but this API does not expose it.
- **Network hierarchy:** the complete Zone-to-transformer hierarchy is not reconstructed by this API.
- **Integration tests:** the current automated tests focus on normalization helpers. They do not comprehensively test the Express routes, session handling, or failure behavior against a mocked portal.
- **Timezone verification:** the UTC interpretation of portal timestamps needs confirmation against the portal's displayed timezone.
- **Caller authentication:** portal credentials authenticate this service to the upstream portal; they do not authenticate clients calling this API. Additional access controls are needed before exposing it publicly.

## What would you improve with another day?

I would first add integration tests with a mocked upstream portal. They should cover successful requests, missing credentials, invalid page numbers, unknown meter IDs, upstream errors, and session reauthentication.

Next, I would add carefully bounded caching for data that does not need to be fetched on every request. I would also evaluate exposing the geolocation endpoint and reconstructing the network hierarchy, while documenting the reliability and maintenance costs of scraping server-rendered pages.

## What would you criticize in this submission?

The solution prioritizes a small, documented API and isolates the legacy portal integration, but its test coverage is still limited. The live portal is an external dependency, and its authentication behavior and response formats may change. More mocked integration tests, explicit caller authentication, and clearer operational logging would improve reliability and maintainability.
