'use strict';

const os = require('os');
const process = require('process');
const { scanHttpInNodes, getFlowNames } = require('./flow-scanner');

const START_TIME = Date.now();

function buildDefaultRouter(RED, config) {
  const express = require('express');
  const router = express.Router();
  const routes = config.defaultRoutes || {};

  // ── 🟢 Base ──────────────────────────────────────────────────────────────

  if (routes.ping) {
    router.get('/ping', (req, res) => {
      res.send('pong');
    });
  }

  if (routes.health) {
    router.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        uptime: Math.floor((Date.now() - START_TIME) / 1000),
        timestamp: new Date().toISOString()
      });
    });
  }

  if (routes.health_live) {
    router.get('/health/live', (req, res) => {
      res.status(200).json({ status: 'alive' });
    });
  }

  if (routes.health_ready) {
    router.get('/health/ready', (req, res) => {
      const ready = RED.settings && RED.settings.available
        ? RED.settings.available()
        : true;
      res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready' });
    });
  }

  if (routes.info) {
    router.get('/info', (req, res) => {
      let flowCount = 0;
      let nodeCount = 0;
      RED.nodes.eachNode(() => { nodeCount++; });
      RED.nodes.eachNode(n => { if (n.type === 'tab') flowCount++; });
      res.json({
        nodeRed: {
          version: RED.version ? RED.version() : 'unknown',
          settings: {
            httpAdminRoot: RED.settings.httpAdminRoot || '/',
            httpNodeRoot: RED.settings.httpNodeRoot || '/'
          }
        },
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch
        },
        os: {
          hostname: os.hostname(),
          type: os.type(),
          release: os.release(),
          uptime: os.uptime()
        },
        process: {
          pid: process.pid,
          uptime: Math.floor((Date.now() - START_TIME) / 1000),
          startedAt: new Date(START_TIME).toISOString()
        },
        flows: {
          count: flowCount,
          nodes: nodeCount
        }
      });
    });
  }

  // ── 🔵 Runtime ────────────────────────────────────────────────────────────

  if (routes.metrics) {
    router.get('/metrics', (req, res) => {
      const mem = process.memoryUsage();
      const cpus = os.cpus();
      res.json({
        memory: {
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
          external: mem.external,
          arrayBuffers: mem.arrayBuffers
        },
        os: {
          totalMemory: os.totalmem(),
          freeMemory: os.freemem(),
          loadAverage: os.loadavg(),
          cpuCount: cpus.length,
          cpuModel: cpus[0] ? cpus[0].model : 'unknown'
        },
        process: {
          uptime: process.uptime(),
          pid: process.pid
        }
      });
    });
  }

  if (routes.env) {
    router.get('/env', (req, res) => {
      const whitelist = config.envWhitelist || [];
      let envData = {};
      if (whitelist.length > 0) {
        whitelist.forEach(key => {
          if (process.env[key] !== undefined) {
            envData[key] = process.env[key];
          }
        });
      } else {
        Object.keys(process.env).forEach(key => {
          if (key.startsWith('NR_') || key.startsWith('NODE_RED_')) {
            envData[key] = process.env[key];
          }
        });
      }
      res.json(envData);
    });
  }

  if (routes.context) {
    router.get('/context', (req, res) => {
      const whitelist = config.contextWhitelist || [];
      let contextData = {};
      try {
        const store = RED.nodes.getContext ? RED.nodes.getContext('global') : null;
        if (store) {
          const keys = whitelist.length > 0 ? whitelist : (store.keys ? store.keys() : []);
          keys.forEach(k => {
            contextData[k] = store.get(k);
          });
        }
      } catch (e) {
        contextData = { error: 'Context not accessible: ' + e.message };
      }
      res.json(contextData);
    });
  }

  // ── 🟡 Flow Debug ─────────────────────────────────────────────────────────

  if (routes.flows) {
    router.get('/flows', (req, res) => {
      const flows = [];
      RED.nodes.eachNode(node => {
        if (node.type === 'tab') {
          flows.push({ id: node.id, label: node.label || node.id, disabled: node.disabled || false });
        }
      });
      res.json(flows);
    });
  }

  if (routes.flows_count) {
    router.get('/flows/count', (req, res) => {
      const typeCounts = {};
      let total = 0;
      let flows = 0;
      RED.nodes.eachNode(node => {
        total++;
        typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
        if (node.type === 'tab') flows++;
      });
      res.json({ flows, totalNodes: total, byType: typeCounts });
    });
  }

  if (routes.nodes) {
    router.get('/nodes', (req, res) => {
      const nodeSet = new Set();
      RED.nodes.eachNode(node => nodeSet.add(node.type));
      res.json([...nodeSet].sort());
    });
  }

  if (routes.nodes_http) {
    router.get('/nodes/http', (req, res) => {
      const httpNodes = scanHttpInNodes(RED);
      const flowNames = getFlowNames(RED);
      res.json(httpNodes.map(n => ({ ...n, flowName: flowNames[n.flowId] || n.flowId })));
    });
  }

  // ── 🟠 Diagnostics ────────────────────────────────────────────────────────

  if (routes.diagnostics) {
    router.get('/diagnostics', (req, res) => {
      const mem = process.memoryUsage();
      let flowCount = 0;
      let nodeCount = 0;
      RED.nodes.eachNode(n => { nodeCount++; if (n.type === 'tab') flowCount++; });
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - START_TIME) / 1000),
        nodeRed: { version: RED.version ? RED.version() : 'unknown' },
        node: { version: process.version },
        os: { hostname: os.hostname(), freeMemory: os.freemem(), totalMemory: os.totalmem() },
        memory: { heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
        flows: { count: flowCount, nodes: nodeCount }
      });
    });
  }

  if (routes.logs) {
    router.get('/logs', (req, res) => {
      const limit = parseInt(req.query.limit) || 100;
      const buffer = global._scalarDocsLogBuffer || [];
      res.json(buffer.slice(-limit));
    });
  }

  if (routes.logs_errors) {
    router.get('/logs/errors', (req, res) => {
      const limit = parseInt(req.query.limit) || 50;
      const buffer = global._scalarDocsLogBuffer || [];
      res.json(buffer.filter(l => l.level === 'error').slice(-limit));
    });
  }

  // ── 🔴 Dev Tools ──────────────────────────────────────────────────────────

  if (routes.echo) {
    router.post('/echo', (req, res) => {
      res.json({
        method: req.method,
        headers: req.headers,
        query: req.query,
        body: req.body
      });
    });
  }

  if (routes.auth_test) {
    router.get('/auth/test', (req, res) => {
      const token = config.bearerToken;
      if (!token) {
        return res.json({ configured: false, message: 'No bearer token configured' });
      }
      const auth = req.headers['authorization'] || '';
      const provided = auth.replace(/^Bearer\s+/i, '');
      const valid = provided === token;
      res.status(valid ? 200 : 401).json({ valid, message: valid ? 'Token valid' : 'Token invalid or missing' });
    });
  }

  if (routes.dependencies) {
    router.get('/dependencies', (req, res) => {
      try {
        const pkgPath = require('path').join(RED.settings.userDir || process.cwd(), 'package.json');
        const pkg = require(pkgPath);
        res.json({ dependencies: pkg.dependencies || {}, devDependencies: pkg.devDependencies || {} });
      } catch (e) {
        res.status(500).json({ error: 'Cannot read package.json: ' + e.message });
      }
    });
  }

  if (routes.dependencies_outdated) {
    router.get('/dependencies/outdated', (req, res) => {
      const { exec } = require('child_process');
      const cwd = RED.settings.userDir || process.cwd();
      exec('npm outdated --json', { cwd }, (err, stdout) => {
        try {
          const data = JSON.parse(stdout || '{}');
          res.json(data);
        } catch (e) {
          res.json({});
        }
      });
    });
  }

  return router;
}

function buildDefaultOpenApiPaths(config) {
  const routes = config.defaultRoutes || {};
  const paths = {};

  const add = (method, path, summary, description, responseSchema, tags) => {
    if (!paths[path]) paths[path] = {};
    paths[path][method] = {
      summary,
      description: description || '',
      tags: tags || ['System'],
      responses: {
        '200': {
          description: 'OK',
          content: { 'application/json': { schema: responseSchema || { type: 'object' } } }
        }
      }
    };
  };

  if (routes.ping) add('get', '/ping', 'Ping', 'Minimal liveness check', { type: 'string', example: 'pong' }, ['Base']);
  if (routes.health) add('get', '/health', 'Health', 'Returns service status and uptime', { type: 'object', properties: { status: { type: 'string' }, uptime: { type: 'integer' }, timestamp: { type: 'string', format: 'date-time' } } }, ['Base']);
  if (routes.health_live) add('get', '/health/live', 'Liveness probe', 'K8s/Docker liveness probe — always 200 if process is alive', null, ['Base']);
  if (routes.health_ready) add('get', '/health/ready', 'Readiness probe', 'Returns 200 only when Node-RED has finished deploying flows', null, ['Base']);
  if (routes.info) add('get', '/info', 'System info', 'Node-RED version, Node.js, OS, hostname, uptime and flow stats', null, ['Base']);
  if (routes.metrics) add('get', '/metrics', 'Runtime metrics', 'CPU, memory, heap and event loop metrics', null, ['Runtime']);
  if (routes.env) add('get', '/env', 'Environment variables', 'Exposed environment variables (filtered by whitelist)', null, ['Runtime']);
  if (routes.context) add('get', '/context', 'Global context', 'Node-RED global context (filtered by whitelist)', null, ['Runtime']);
  if (routes.flows) add('get', '/flows', 'List flows', 'All active flows with ID and label', null, ['Flow Debug']);
  if (routes.flows_count) add('get', '/flows/count', 'Flow stats', 'Flow count, total nodes and breakdown by type', null, ['Flow Debug']);
  if (routes.nodes) add('get', '/nodes', 'Installed node types', 'All node types currently installed', { type: 'array', items: { type: 'string' } }, ['Flow Debug']);
  if (routes.nodes_http) add('get', '/nodes/http', 'HTTP nodes', 'All http-in nodes detected in flows', null, ['Flow Debug']);
  if (routes.diagnostics) add('get', '/diagnostics', 'Full diagnostics', 'Aggregated health + metrics + info in a single call', null, ['Diagnostics']);
  if (routes.logs) add('get', '/logs', 'Recent logs', 'Last N log entries from Node-RED', { type: 'array', items: { type: 'object' } }, ['Diagnostics']);
  if (routes.logs_errors) add('get', '/logs/errors', 'Error logs', 'Only error-level log entries', { type: 'array', items: { type: 'object' } }, ['Diagnostics']);
  if (routes.echo) {
    if (!paths['/echo']) paths['/echo'] = {};
    paths['/echo']['post'] = { summary: 'Echo', description: 'Returns the received body — useful for client testing', tags: ['Dev Tools'], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '200': { description: 'Echoed request' } } };
  }
  if (routes.auth_test) add('get', '/auth/test', 'Test auth token', 'Verifies the configured Bearer token', null, ['Dev Tools']);
  if (routes.dependencies) add('get', '/dependencies', 'npm dependencies', 'Lists installed npm packages with versions', null, ['Dev Tools']);
  if (routes.dependencies_outdated) add('get', '/dependencies/outdated', 'Outdated packages', 'Lists packages with available updates (runs npm outdated)', null, ['Dev Tools']);

  return paths;
}

function hookLogger(RED) {
  const MAX = 500;
  global._scalarDocsLogBuffer = global._scalarDocsLogBuffer || [];
  if (RED.log && !RED.log._scalarHooked) {
    RED.log._scalarHooked = true;
    const orig = RED.log.log.bind(RED.log);
    RED.log.log = function(msg) {
      global._scalarDocsLogBuffer.push({ ...msg, ts: new Date().toISOString() });
      if (global._scalarDocsLogBuffer.length > MAX) global._scalarDocsLogBuffer.shift();
      return orig(msg);
    };
  }
}

module.exports = { buildDefaultRouter, buildDefaultOpenApiPaths, hookLogger };
