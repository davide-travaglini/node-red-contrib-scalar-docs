# Changelog

## [0.1.0] - Initial release

### Added
- `scalar-docs` config node with three-tab editor (General, Endpoints, Default Routes)
- Auto-discovery of all `http in` nodes across all flows
- Per-endpoint metadata: summary, description, tags, deprecated, operationId
- Per-endpoint parameters (query, path, header, cookie) with type, required, description, example
- Per-endpoint request body with content-type and JSON Schema
- Per-endpoint response definitions with status code, description and JSON Schema
- Auto-detection of path parameters from `:param` syntax
- Exclude toggle per endpoint
- JSON config viewer + clipboard copy per endpoint
- Orphan cleanup button
- 🟢 Base default routes: /ping, /health, /health/live, /health/ready, /info
- 🔵 Runtime default routes: /metrics, /env, /context
- 🟡 Flow Debug routes: /flows, /flows/count, /nodes, /nodes/http
- 🟠 Diagnostics routes: /diagnostics, /logs, /logs/errors
- 🔴 Dev Tools routes: /echo, /auth/test, /dependencies, /dependencies/outdated
- Quick preset buttons for default route groups
- Individual toggles for every default route
- Optional Bearer token authentication for UI and spec
- Scalar UI served via CDN with theme selection
- OpenAPI 3.0.3 spec auto-generated at <path>/openapi.json
- Log ring buffer (500 entries) for /logs endpoints
- http-in node toolbar button extension ("📄 Scalar Docs")
- Admin API endpoints for editor communication (/scalar-docs/http-nodes, /scalar-docs/cleanup-orphans)
