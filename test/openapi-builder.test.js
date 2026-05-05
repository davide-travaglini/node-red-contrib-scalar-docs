'use strict';

jest.mock('../lib/default-endpoints', () => ({
  buildDefaultOpenApiPaths: () => ({})
}));

const { convertPath, buildOpenApiSpec } = require('../lib/openapi-builder');

function makeRed(nodes) {
  return { nodes: { eachNode: (fn) => nodes.forEach(fn) } };
}

describe('convertPath', () => {
  test('converts :param to {param}', () => {
    expect(convertPath('/users/:id')).toBe('/users/{id}');
  });

  test('converts multiple params', () => {
    expect(convertPath('/users/:userId/posts/:postId')).toBe('/users/{userId}/posts/{postId}');
  });

  test('leaves plain paths unchanged', () => {
    expect(convertPath('/health')).toBe('/health');
  });

  test('handles undefined url', () => {
    expect(convertPath(undefined)).toBe('/');
  });

  test('handles empty string', () => {
    expect(convertPath('')).toBe('/');
  });
});

describe('buildOpenApiSpec', () => {
  test('builds valid OpenAPI 3.0.3 spec', () => {
    const RED = makeRed([
      { type: 'tab', id: 'f1', label: 'Main' },
      { type: 'http in', id: 'n1', method: 'get', url: '/ping', z: 'f1' }
    ]);
    const config = { title: 'Test API', version: '2.0.0', endpoints: {}, defaultRoutes: {} };
    const spec = buildOpenApiSpec(RED, config);

    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBe('Test API');
    expect(spec.info.version).toBe('2.0.0');
    expect(spec.paths['/ping']).toBeDefined();
    expect(spec.paths['/ping'].get).toBeDefined();
  });

  test('excludes nodes marked as excluded', () => {
    const RED = makeRed([
      { type: 'http in', id: 'n1', method: 'get', url: '/secret', z: '' }
    ]);
    const config = { endpoints: { n1: { excluded: true } }, defaultRoutes: {} };
    const spec = buildOpenApiSpec(RED, config);

    expect(spec.paths['/secret']).toBeUndefined();
  });

  test('auto-detects path parameters from URL', () => {
    const RED = makeRed([
      { type: 'http in', id: 'n1', method: 'get', url: '/users/:id', z: '' }
    ]);
    const config = { endpoints: {}, defaultRoutes: {} };
    const spec = buildOpenApiSpec(RED, config);
    const params = spec.paths['/users/{id}'].get.parameters;

    expect(params.some(p => p.name === 'id' && p.in === 'path' && p.required === true)).toBe(true);
  });

  test('uses flow name as default tag', () => {
    const RED = makeRed([
      { type: 'tab', id: 'f1', label: 'My Flow' },
      { type: 'http in', id: 'n1', method: 'get', url: '/test', z: 'f1' }
    ]);
    const config = { endpoints: {}, defaultRoutes: {} };
    const spec = buildOpenApiSpec(RED, config);

    expect(spec.paths['/test'].get.tags).toContain('My Flow');
  });

  test('uses custom tags when provided', () => {
    const RED = makeRed([
      { type: 'http in', id: 'n1', method: 'get', url: '/test', z: '' }
    ]);
    const config = { endpoints: { n1: { tags: ['users', 'auth'] } }, defaultRoutes: {} };
    const spec = buildOpenApiSpec(RED, config);

    expect(spec.paths['/test'].get.tags).toEqual(['users', 'auth']);
  });

  test('adds servers when baseUrl is set', () => {
    const RED = makeRed([]);
    const config = { baseUrl: 'http://localhost:1880', endpoints: {}, defaultRoutes: {} };
    const spec = buildOpenApiSpec(RED, config);

    expect(spec.servers).toHaveLength(1);
    expect(spec.servers[0].url).toBe('http://localhost:1880');
  });

  test('omits servers when baseUrl is empty', () => {
    const RED = makeRed([]);
    const config = { baseUrl: '', endpoints: {}, defaultRoutes: {} };
    const spec = buildOpenApiSpec(RED, config);

    expect(spec.servers).toBeUndefined();
  });

  test('treats "use" method as get', () => {
    const RED = makeRed([
      { type: 'http in', id: 'n1', method: 'use', url: '/any', z: '' }
    ]);
    const config = { endpoints: {}, defaultRoutes: {} };
    const spec = buildOpenApiSpec(RED, config);

    expect(spec.paths['/any'].get).toBeDefined();
  });
});
