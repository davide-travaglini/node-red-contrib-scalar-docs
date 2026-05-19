'use strict';

const { scanHttpInNodes, getFlows } = require('./flow-scanner');
const { buildDefaultOpenApiPaths } = require('./default-endpoints');

function convertPath(url) {
  return (url || '/').replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
}

function extractPathParams(url) {
  const params = [];
  const re = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let m;
  while ((m = re.exec(url)) !== null) {
    params.push(m[1]);
  }
  return params;
}

function buildOpenApiSpec(RED, config) {
  const httpNodes = scanHttpInNodes(RED);
  const flows = getFlows(RED);
  const endpoints = config.endpoints || {};

  const paths = {};

  for (const node of httpNodes) {
    const meta = endpoints[node.id] || {};

    if (meta.excluded === true) continue;

    const openApiPath = convertPath(node.url);
    const method = node.method === 'use' ? 'get' : node.method.toLowerCase();

    const savedParams = meta.parameters || [];
    const pathParamNames = extractPathParams(node.url);

    const autoPathParams = pathParamNames
      .filter(name => !savedParams.find(p => p.in === 'path' && p.name === name))
      .map(name => ({
        in: 'path',
        name,
        required: true,
        schema: { type: 'string' },
        description: ''
      }));

    const parameters = [
      ...autoPathParams,
      ...savedParams.map(p => ({
        in: p.in || 'query',
        name: p.name,
        required: p.required === true,
        description: p.description || '',
        schema: {
          type: p.type || 'string',
          ...(p.format ? { format: p.format } : {}),
          ...(p.example !== undefined ? { example: p.example } : {}),
          ...(p.enum && p.enum.length > 0 ? { enum: p.enum } : {})
        }
      }))
    ];

    let requestBody;
    if (meta.requestBody && meta.requestBody.schema) {
      requestBody = {
        required: true,
        content: {
          [meta.requestBody.contentType || 'application/json']: {
            schema: meta.requestBody.schema
          }
        }
      };
      if (meta.requestBody.description) {
        requestBody.description = meta.requestBody.description;
      }
    }

    const savedResponses = meta.responses || [];
    const responses = {};
    if (savedResponses.length > 0) {
      savedResponses.forEach(r => {
        const code = String(r.code || 200);
        responses[code] = { description: r.description || 'Response' };
        if (r.schema) {
          responses[code].content = { 'application/json': { schema: r.schema } };
        }
      });
    } else {
      responses['200'] = { description: 'OK' };
    }

    const operation = {
      summary: meta.summary || node.name || `${method.toUpperCase()} ${node.url}`,
      description: meta.description || '',
      tags: meta.tags && meta.tags.length > 0
        ? meta.tags
        : [flows[node.flowId] ? flows[node.flowId].name : 'Default'],
      deprecated: meta.deprecated === true,
      parameters,
      responses,
      'x-node-id': node.id,
      'x-flow-id': node.flowId
    };

    if (requestBody) operation.requestBody = requestBody;
    if (meta.operationId) operation.operationId = meta.operationId;
    if (!operation.description) delete operation.description;

    if (!paths[openApiPath]) paths[openApiPath] = {};
    paths[openApiPath][method] = operation;
  }

  const defaultPaths = buildDefaultOpenApiPaths(config);
  Object.assign(paths, defaultPaths);

  const servers = [];
  let parsedServers = [];
  if (Array.isArray(config.servers)) {
    parsedServers = config.servers;
  } else if (typeof config.servers === 'string') {
    try {
      parsedServers = JSON.parse(config.servers);
    } catch(e) { /* ignore */ }
  }

  if (parsedServers && parsedServers.length > 0) {
    servers.push(...parsedServers);
  } else if (config.baseUrl) {
    servers.push({ url: config.baseUrl, description: 'Node-RED server' });
  }

  const spec = {
    openapi: '3.0.3',
    info: {
      title: config.title || 'Node-RED API',
      version: config.version || '1.0.0',
      description: config.description || 'Auto-generated API documentation from Node-RED flows'
    },
    ...(servers.length > 0 ? { servers } : {}),
    paths,
    tags: buildTagList(RED, config, flows)
  };

  if (config.bearerToken) {
    spec.components = {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    };
    spec.security = [{ bearerAuth: [] }];
  }

  return spec;
}

function buildTagList(RED, config, flows) {
  const tagsMap = new Map();
  const httpNodes = scanHttpInNodes(RED);
  const endpoints = config.endpoints || {};

  for (const node of httpNodes) {
    const meta = endpoints[node.id] || {};
    if (meta.excluded) continue;
    if (meta.tags && meta.tags.length > 0) {
      meta.tags.forEach(t => {
        if (!tagsMap.has(t)) tagsMap.set(t, { name: t });
      });
    } else {
      const flowName = flows[node.flowId] ? flows[node.flowId].name : 'Default';
      const flowDesc = flows[node.flowId] ? flows[node.flowId].description : '';
      if (!tagsMap.has(flowName)) {
        tagsMap.set(flowName, { name: flowName, ...(flowDesc ? { description: flowDesc } : {}) });
      }
    }
  }

  const dr = config.defaultRoutes || {};
  if (dr.ping || dr.health || dr.health_live || dr.health_ready || dr.info) tagsMap.set('Base', { name: 'Base' });
  if (dr.metrics || dr.env || dr.context) tagsMap.set('Runtime', { name: 'Runtime' });
  if (dr.flows || dr.flows_count || dr.nodes || dr.nodes_http) tagsMap.set('Flow Debug', { name: 'Flow Debug' });
  if (dr.diagnostics || dr.logs || dr.logs_errors) tagsMap.set('Diagnostics', { name: 'Diagnostics' });
  if (dr.echo || dr.auth_test || dr.dependencies || dr.dependencies_outdated) tagsMap.set('Dev Tools', { name: 'Dev Tools' });

  return Array.from(tagsMap.values());
}

module.exports = { buildOpenApiSpec, convertPath };
