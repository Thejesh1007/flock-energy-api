
# Flock Energy — Urja Meter Ops API

A REST API wrapper around the legacy Urja Meter Ops portal, built for the Flock Energy engineering take-home assignment.

## Overview

The legacy portal exposes its meter and transformer data through internal endpoints rather than a documented public API. This service authenticates with the portal, requests its data, normalizes consumption readings, and exposes a small REST API.

The integration with the legacy portal is isolated in `src/urjaClient.js`. The Express routes call that adapter rather than communicating with the portal directly.

## Technology

- Node.js and Express
- Axios for HTTP requests
- `axios-cookiejar-support` and `tough-cookie` for session cookies
- `dotenv` for environment-based configuration
- Swagger UI and OpenAPI 3 for API documentation
- Node.js built-in test runner for automated tests

## Project structure

```text
flock-energy-api/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config.js
│   ├── routes.js
│   └── urjaClient.js
├── test/
│   └── normalization.test.js
├── .env.example
├── .gitignore
├── openapi.json
├── PROTOCOL.md
├── REFLECTION.md
├── package.json
└── README.md
```

- `app.js` configures Express, health checks, API routes, Swagger UI, and error handling.
- `server.js` starts the HTTP server.
- `config.js` loads environment variables and applies configuration defaults.
- `routes.js` defines the public API endpoints.
- `urjaClient.js` manages portal authentication, HTTP requests, and data normalization.
- `openapi.json` describes the API contract.
- `PROTOCOL.md` records observations about the legacy portal.
- `REFLECTION.md` documents assumptions, challenges, and possible improvements.

## Prerequisites

- Node.js 18 or later
- npm
- Valid portal credentials and access to the configured portal

## Setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env` in the project root.

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Edit `.env` and configure the values:

   ```dotenv
   PORT=3000
   PORTAL_BASE_URL=https://urja-ops.flockenergy.tech
   PORTAL_USERNAME=your-portal-username
   PORTAL_PASSWORD=your-portal-password
   PORTAL_TIMEOUT_MS=10000
   ```

   Replace the username and password placeholders with the credentials provided for your environment. Do not commit `.env` or publish real credentials.

4. Start the server:

   ```bash
   npm start
   ```

   For development with automatic restarts:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000/health`. The default port is configurable through `PORT`.

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/v1/meters?q=&page=1` | List or search meters |
| GET | `/api/v1/meters/:id` | Retrieve one meter by its exact meter ID |
| GET | `/api/v1/meters/:id/consumption` | Retrieve normalized consumption readings |
| GET | `/api/v1/transformers?page=1` | List distribution transformers |
| GET | `/docs` | Interactive Swagger UI |
| GET | `/openapi.json` | OpenAPI specification in JSON |

### List or search meters

```http
GET /api/v1/meters?page=1
GET /api/v1/meters?q=J100000&page=1
```

The optional `q` parameter searches by meter number or serial number. `page` is a positive integer and defaults to `1`.

The portal returns paginated data. Its current page size is controlled by the portal.

### Retrieve one meter

```http
GET /api/v1/meters/J100000
```

The meter ID must match a meter ID returned by the portal. An unknown ID returns `404`.

### Retrieve consumption history

```http
GET /api/v1/meters/J100000/consumption
```

The response contains a `meterId` and a `readings` array. Reading timestamps are normalized to ISO 8601 strings, and numeric fields are converted to numbers where possible.

Example response shape:

```json
{
  "meterId": "J100000",
  "readings": [
    {
      "timestamp": "2026-06-23T23:30:00.000Z",
      "kwh": 48438.74,
      "kvah": 52313.84,
      "voltageR": 226
    }
  ]
}
```

This is an illustrative example; live values depend on the portal data.

### List transformers

```http
GET /api/v1/transformers?page=1
```

Returns the portal's paginated transformer data.

## Error handling

The API uses HTTP status codes and JSON error responses. Examples include:

- `400` — invalid page parameter
- `404` — unknown API route or meter ID
- `502` — upstream portal or portal authentication failure
- `503` — required portal credentials are missing

The portal is an external dependency, so upstream errors may prevent data requests from succeeding.

## Tests

Run the automated test suite:

```bash
npm test
```

The current tests cover numeric conversion and timestamp normalization, including invalid values and impossible dates.

## Design decisions and limitations

- **Adapter separation:** portal-specific authentication and endpoints are kept in `urjaClient.js`.
- **Normalization:** conversion of numeric strings and portal timestamps is centralized in the client.
- **No database:** requests use live portal data; the API does not maintain its own data store.
- **No cache:** responses are not cached, so repeated requests may repeatedly contact the portal.
- **No network hierarchy endpoint:** the full Zone-to-transformer hierarchy is not exposed by this API.
- **No geolocation endpoint:** the portal's meter geolocation capability is not currently exposed.
- **No API-level authentication:** the portal credentials authenticate the service to the upstream portal; they do not authenticate callers of this API. Do not expose the service publicly without appropriate access controls.

See [PROTOCOL.md](./PROTOCOL.md) for portal observations, [REFLECTION.md](./REFLECTION.md) for implementation reflections, and [openapi.json](./openapi.json) for the API specification.
