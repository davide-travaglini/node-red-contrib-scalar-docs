# node-red-contrib-scalar-docs

Auto-generates and serves a [Scalar](https://scalar.com) API documentation UI for all `http in` nodes in your Node-RED flows.

## Features

- Auto-discovery of all `http in` nodes across all flows
- Per-endpoint metadata: summary, description, tags, parameters, request body, response schemas
- Built-in system endpoints (`/health`, `/info`, `/metrics`, `/ping` and more), each individually toggleable
- Modern interactive UI with multiple Scalar themes
- Optional Bearer token to protect the docs and the OpenAPI spec
- Inline button in every `http in` editor to jump directly to the endpoint config

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
| Bearer Token | — | If set, protects both the UI and the `/openapi.json` endpoint |

### Endpoints tab

Lists all `http in` nodes found in flows. Each entry can be:

- Excluded from the documentation
- Expanded to edit: summary, description (Markdown), tags, deprecated flag, parameters (query/path/header/cookie), request body (content-type + JSON Schema), response definitions (status code + description + JSON Schema)

The **Cleanup orphans** button removes saved configs for nodes that no longer exist in the flow.

### Default Routes tab

Toggle built-in diagnostic endpoints individually or use the preset buttons to enable groups.

**Base**

| Endpoint | Description |
|---|---|
| `GET /ping` | Returns `pong` — minimal liveness check |
| `GET /health` | Status, uptime and current timestamp |
| `GET /health/live` | Liveness probe, always 200 if the process is alive |
| `GET /health/ready` | Readiness probe, returns 200 only after flows have been deployed |
| `GET /info` | Node-RED version, Node.js version, OS, hostname, uptime and flow count |

**Runtime**

| Endpoint | Description |
|---|---|
| `GET /metrics` | CPU usage, memory, V8 heap and event loop stats |
| `GET /env` | Environment variables filtered by a configurable whitelist (`NR_*` by default) |
| `GET /context` | Node-RED global context, filtered by a configurable whitelist |

**Flow Debug**

| Endpoint | Description |
|---|---|
| `GET /flows` | Active flows with their ID and label |
| `GET /flows/count` | Total flow count and node breakdown by type |
| `GET /nodes` | All installed node type names |
| `GET /nodes/http` | All `http in` nodes currently detected in flows |

**Diagnostics**

| Endpoint | Description |
|---|---|
| `GET /diagnostics` | Single aggregated response combining health, metrics and info |
| `GET /logs` | Last N log entries from the in-memory ring buffer (`?limit=100`) |
| `GET /logs/errors` | Same as `/logs` but filtered to error-level entries only |

**Dev Tools**

| Endpoint | Description |
|---|---|
| `POST /echo` | Returns the received request body — useful for testing HTTP clients |
| `GET /auth/test` | Verifies the configured Bearer token and returns its validity |
| `GET /dependencies` | Lists installed npm packages with their current versions |
| `GET /dependencies/outdated` | Runs `npm outdated` and returns packages that have available updates |

## http-in integration

When editing any `http in` node, a **Scalar Docs** row is added to the form. Use it to:

- Select or create a `scalar-docs` config node to associate with the endpoint
- Click the pencil icon to open the config and jump directly to the Endpoints tab
- Click the `+` icon to create a new `scalar-docs` config node

The association is saved on the `http in` node and the `scalar-docs` label shows the number of linked endpoints.

## OpenAPI spec

Available at `<UI Path>/openapi.json`. The spec is regenerated on every request from the live flow state. Path parameters using `:param` syntax are auto-detected and merged with any manually defined parameters.

## Security

- `/env` exposes only variables prefixed with `NR_` or `NODE_RED_` unless an explicit whitelist is configured
- `/context` exposes nothing without a whitelist
- Set a Bearer token in the General settings to restrict documentation access in production

## License

MIT
