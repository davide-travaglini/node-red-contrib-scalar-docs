# node-red-contrib-scalar-docs

[![npm version](https://img.shields.io/npm/v/node-red-contrib-scalar-docs.svg)](https://www.npmjs.com/package/node-red-contrib-scalar-docs)
[![npm downloads](https://img.shields.io/npm/dm/node-red-contrib-scalar-docs.svg)](https://www.npmjs.com/package/node-red-contrib-scalar-docs)
[![Node.js ≥16](https://img.shields.io/badge/node-%3E%3D16-brightgreen.svg)](https://nodejs.org)
[![Node-RED ≥3](https://img.shields.io/badge/node--red-%3E%3D3.0-red.svg)](https://nodered.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

If you'd like to support me, [![Ko-fi](https://img.shields.io/badge/Buy%20me%20a%20coffee-%23FF5E5B?logo=ko-fi&logoColor=white&style=flat)](https://ko-fi.com/davidetravaglini)

Auto-generates and serves a [Scalar](https://scalar.com) API documentation UI for all `http in` nodes in your Node-RED flows.

## Features

- Auto-discovery of all `http in` nodes across all flows
- Per-endpoint metadata: summary, description, tags, parameters, request body, response schemas
- Tag descriptions extracted directly from Node-RED flow information properties
- Built-in system endpoints served under `/api/scalar/` (`/api/scalar/health`, `/api/scalar/ping`, etc.), each individually toggleable
- Modern interactive UI with multiple Scalar themes
- Optional Bearer token to protect the docs and the OpenAPI spec (stored securely in Node-RED credentials, generating OpenAPI Security Schemes)
- Support for defining multiple base servers via JSON arrays
- Export and import functionality for endpoint configurations
- Inline button in every `http in` editor to jump directly to the endpoint config

## Requirements

| Dependency | Version |
|---|---|
| Node.js | `>=16` |
| Node-RED | `>=3.0.0` |
| express | `>=4.0.0` (already bundled with Node-RED) |
| @scalar/api-reference | `>=1.0.0` (bundled — fallback to CDN if missing) |

## Installation

```bash
cd ~/.node-red
npm install node-red-contrib-scalar-docs
```

Restart Node-RED after installation.

## Quick Start

1. Open the Node-RED editor
2. Go to **Menu > Configuration nodes** and add a new `scalar-docs` node, or open any `http in` node and use the **Scalar Docs** row to create one
3. Set a **UI Path** (default: `/api-docs`) and enable the routes you need
4. Deploy
5. Open `http://localhost:1880/api-docs`

## Configuration

### General

| Field | Default | Description |
|---|---|---|
| Title | `Node-RED API` | API title shown in the UI |
| Version | `1.0.0` | API version string |
| Description | — | Markdown-supported description |
| UI Path | `/api-docs` | Path where the Scalar UI is served |
| Base URL | — | Server base URL written into the OpenAPI spec |
| Theme | `default` | Scalar UI theme |
| Bearer Token | — | If set, protects both the UI and the `/openapi.json` endpoint. Stored securely in Node-RED credentials and adds `securitySchemes` to the OpenAPI spec. |
| Default Routes Prefix | `/api/scalar` | Prefix for the built-in system endpoints. |
| Env Whitelist | — | Comma-separated list of environment variables allowed to be exposed in the `/env` endpoint (e.g., `NODE_ENV, PORT, HOST`). |
| Context Whitelist | — | Comma-separated list of global context variables allowed to be exposed in the `/context` endpoint (e.g., `dbConfig, api_keys, userSettings`). |
| Additional Servers | — | JSON array defining multiple servers, e.g., `[{"url":"http://prod", "description":"Production"}]` |

### Endpoints tab

Lists all `http in` nodes found in flows. Each entry can be:

- Excluded from the documentation
- Expanded to edit: summary, description (Markdown), tags, deprecated flag, parameters (query/path/header/cookie), request body (content-type + JSON Schema), response definitions (status code + description + JSON Schema)

The **Cleanup** button removes saved configs for nodes that no longer exist in the flow.
The **Export** and **Import** buttons allow you to save your entire endpoint documentation configuration to a JSON file and restore it later.

### Default Routes tab

Toggle built-in diagnostic endpoints individually or use the preset buttons to enable groups.

All default endpoints are served under the `/api/scalar` root (e.g. `/api/scalar/health`) to keep the main application root free. The prefix can be changed with the `defaultRoutesPrefix` option (default: `/api/scalar`).

**Base**

| Endpoint | Description |
|---|---|
| `GET /api/scalar/ping` | Returns `pong` — minimal liveness check |
| `GET /api/scalar/health` | Status, uptime and current timestamp |
| `GET /api/scalar/health/live` | Liveness probe, always 200 if the process is alive |
| `GET /api/scalar/health/ready` | Readiness probe, returns 200 only after flows have been deployed |
| `GET /api/scalar/info` | Node-RED version, Node.js version, OS, hostname, uptime and flow count |

**Runtime**

| Endpoint | Description |
|---|---|
| `GET /api/scalar/metrics` | CPU usage, memory, V8 heap and event loop stats |
| `GET /api/scalar/env` | Environment variables filtered by a configurable whitelist (`NR_*` by default) |
| `GET /api/scalar/context` | Node-RED global context, filtered by a configurable whitelist |

**Flow Debug**

| Endpoint | Description |
|---|---|
| `GET /api/scalar/flows` | Active flows with their ID and label |
| `GET /api/scalar/flows/count` | Total flow count and node breakdown by type |
| `GET /api/scalar/nodes` | All installed node type names |
| `GET /api/scalar/nodes/http` | All `http in` nodes currently detected in flows |

**Diagnostics**

| Endpoint | Description |
|---|---|
| `GET /api/scalar/diagnostics` | Single aggregated response combining health, metrics and info |
| `GET /api/scalar/logs` | Last N log entries from the in-memory ring buffer (`?limit=100`) |
| `GET /api/scalar/logs/errors` | Same as `/api/scalar/logs` but filtered to error-level entries only |

**Dev Tools**

| Endpoint | Description |
|---|---|
| `POST /api/scalar/echo` | Returns the received request body — useful for testing HTTP clients |
| `GET /api/scalar/auth/test` | Verifies the configured Bearer token and returns its validity |
| `GET /api/scalar/dependencies` | Lists installed npm packages with their current versions |
| `GET /api/scalar/dependencies/outdated` | Runs `npm outdated` and returns packages that have available updates |

## http-in integration

When editing any `http in` node, a **Scalar Docs** row is added to the form. Use it to:

- Select or create a `scalar-docs` config node to associate with the endpoint
- Click the pencil icon to open the config and jump directly to the Endpoints tab
- Click the `+` icon to create a new `scalar-docs` config node

The association is saved on the `http in` node and the `scalar-docs` label shows the number of linked endpoints.

## Example Flow

An importable example is available in [`examples/example-flow.json`](examples/example-flow.json).

It contains a `scalar-docs` config node and three working endpoints:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users` | Returns a mock list of users (supports `?limit=N`) |
| `GET` | `/api/users/:id` | Returns a single user or 404 |
| `POST` | `/api/users` | Creates a user (requires `name` and `email`) |

Base diagnostic routes (`/api/scalar/ping`, `/health`, `/info`) and the `POST /api/scalar/echo` endpoint are also enabled.

**How to import:**

1. In Node-RED open **Menu (☰) > Import**
2. Paste the contents of `example-flow.json` or upload the file directly
3. Click **Import**, place the nodes, then **Deploy**
4. Open `http://localhost:1880/api-docs`

## OpenAPI spec

Available at `<UI Path>/openapi.json`. The spec is regenerated on every request from the live flow state. Path parameters using `:param` syntax are auto-detected and merged with any manually defined parameters.

## Security

- `/env` exposes only variables prefixed with `NR_` or `NODE_RED_` unless an explicit whitelist is configured
- `/context` exposes nothing without a whitelist
- Set a Bearer token in the General settings to restrict documentation access in production (the token is saved securely in the Node-RED credentials file, not the flows file).

## License

MIT
