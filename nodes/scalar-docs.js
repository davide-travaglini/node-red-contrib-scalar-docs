'use strict';

const { buildOpenApiSpec } = require('../lib/openapi-builder');
const { buildDefaultRouter, hookLogger } = require('../lib/default-endpoints');
const { scanHttpInNodes, getFlowNames, findOrphanedConfigs } = require('../lib/flow-scanner');

module.exports = function (RED) {

  // ── Config Node ────────────────────────────────────────────────────────────
  function ScalarDocsNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.docsPath    = config.docsPath    || '/api-docs';
    node.title       = config.title       || 'Node-RED API';
    node.version     = config.version     || '1.0.0';
    node.description = config.description || '';
    node.theme       = config.theme       || 'default';
    node.baseUrl     = config.baseUrl     || '';
    node.bearerToken = config.bearerToken || '';
    node.endpoints   = config.endpoints   || {};
    node.defaultRoutes = config.defaultRoutes || {
      ping: true, health: true, health_live: true, info: true
    };
    node.envWhitelist     = config.envWhitelist     || [];
    node.contextWhitelist = config.contextWhitelist || [];

    hookLogger(RED);
    const registeredPaths = new Set();
    registerRoutes(RED, node, registeredPaths);

    node.on('close', function (done) {
      unregisterRoutes(RED, registeredPaths);
      done();
    });
  }

  RED.nodes.registerType('scalar-docs', ScalarDocsNode);

  // ── HTTP Routes ────────────────────────────────────────────────────────────

  function registerRoutes(RED, node, registeredPaths) {
    const docsPath  = node.docsPath.replace(/\/$/, '');
    const specPath  = docsPath + '/openapi.json';
    const uiPath    = docsPath;

    function authMiddleware(req, res, next) {
      if (!node.bearerToken) return next();
      const auth = req.headers['authorization'] || '';
      const token = auth.replace(/^Bearer\s+/i, '');
      if (token !== node.bearerToken) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      next();
    }

    RED.httpNode.get(specPath, authMiddleware, function (req, res) {
      try {
        const spec = buildOpenApiSpec(RED, node);
        res.json(spec);
      } catch (e) {
        node.error('Scalar: failed to build OpenAPI spec: ' + e.message);
        res.status(500).json({ error: e.message });
      }
    });
    registeredPaths.add(specPath);

    RED.httpNode.get(uiPath, authMiddleware, function (req, res) {
      res.send(buildScalarHtml(node, specPath));
    });
    registeredPaths.add(uiPath);

    const defaultRouter = buildDefaultRouter(RED, node);
    RED.httpNode.use('/', defaultRouter);

    node.log(`Scalar docs available at ${uiPath}`);
  }

  function unregisterRoutes(RED, registeredPaths) {
    if (RED.httpNode && RED.httpNode._router) {
      RED.httpNode._router.stack = RED.httpNode._router.stack.filter(layer => {
        if (!layer.route) return true;
        return !registeredPaths.has(layer.route.path);
      });
    }
    registeredPaths.clear();
  }

  // ── Admin API endpoints (used by the editor UI) ───────────────────────────

  RED.httpAdmin.get('/scalar-docs/http-nodes', RED.auth.needsPermission('flows.read'), function (req, res) {
    try {
      const nodes     = scanHttpInNodes(RED);
      const flowNames = getFlowNames(RED);
      res.json(nodes.map(n => ({ ...n, flowName: flowNames[n.flowId] || n.flowId })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  RED.httpAdmin.post('/scalar-docs/cleanup-orphans', RED.auth.needsPermission('flows.write'), function (req, res) {
    try {
      const savedEndpoints = req.body.endpoints || {};
      const currentNodes   = scanHttpInNodes(RED);
      const orphans        = findOrphanedConfigs(savedEndpoints, currentNodes);
      res.json({ orphans });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Scalar HTML page ───────────────────────────────────────────────────────

  function buildScalarHtml(node, specPath) {
    const themeMap = {
      default:    'default',
      purple:     'purple',
      bluePlanet: 'bluePlanet',
      deepSpace:  'deepSpace',
      saturn:     'saturn',
      kepler:     'kepler',
      mars:       'mars',
      none:       'none'
    };
    const theme = themeMap[node.theme] || 'default';

    return `<!doctype html>
<html>
  <head>
    <title>${escHtml(node.title)}</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="${escHtml(specPath)}"
      data-configuration="${escAttr(JSON.stringify({
        theme,
        layout: 'modern',
        defaultHttpClient: { targetKey: 'javascript', clientKey: 'fetch' }
      }))}">
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
};
