'use strict';

const { scanHttpInNodes, getFlowNames, findOrphanedConfigs } = require('../lib/flow-scanner');

function makeRed(nodes) {
  return { nodes: { eachNode: (fn) => nodes.forEach(fn) } };
}

describe('scanHttpInNodes', () => {
  test('returns http in nodes', () => {
    const RED = makeRed([
      { type: 'http in', id: '1', method: 'get', url: '/test', z: 'flow1' },
      { type: 'debug', id: '2' }
    ]);
    const result = scanHttpInNodes(RED);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: '1', name: '', method: 'get', url: '/test', flowId: 'flow1' });
  });

  test('defaults method to get when missing', () => {
    const RED = makeRed([{ type: 'http in', id: '1', url: '/x', z: '' }]);
    expect(scanHttpInNodes(RED)[0].method).toBe('get');
  });

  test('defaults url to / when missing', () => {
    const RED = makeRed([{ type: 'http in', id: '1', method: 'post', z: '' }]);
    expect(scanHttpInNodes(RED)[0].url).toBe('/');
  });

  test('returns empty array when no http in nodes', () => {
    const RED = makeRed([{ type: 'tab', id: '1', label: 'Flow 1' }]);
    expect(scanHttpInNodes(RED)).toHaveLength(0);
  });

  test('lowercases method', () => {
    const RED = makeRed([{ type: 'http in', id: '1', method: 'POST', url: '/', z: '' }]);
    expect(scanHttpInNodes(RED)[0].method).toBe('post');
  });
});

describe('getFlowNames', () => {
  test('maps tab node ids to labels', () => {
    const RED = makeRed([
      { type: 'tab', id: 'f1', label: 'My Flow' },
      { type: 'http in', id: 'n1', url: '/', z: 'f1' }
    ]);
    expect(getFlowNames(RED)).toEqual({ f1: 'My Flow' });
  });

  test('falls back to id when label is missing', () => {
    const RED = makeRed([{ type: 'tab', id: 'f1' }]);
    expect(getFlowNames(RED)).toEqual({ f1: 'f1' });
  });

  test('returns empty object when no tabs', () => {
    const RED = makeRed([{ type: 'http in', id: 'n1', url: '/', z: '' }]);
    expect(getFlowNames(RED)).toEqual({});
  });
});

describe('findOrphanedConfigs', () => {
  test('returns ids not in current nodes', () => {
    const saved = { 'old-id': {}, 'current-id': {} };
    const current = [{ id: 'current-id' }];
    expect(findOrphanedConfigs(saved, current)).toEqual(['old-id']);
  });

  test('returns empty array when all configs are current', () => {
    const saved = { 'n1': {}, 'n2': {} };
    const current = [{ id: 'n1' }, { id: 'n2' }];
    expect(findOrphanedConfigs(saved, current)).toHaveLength(0);
  });

  test('handles empty saved configs', () => {
    expect(findOrphanedConfigs({}, [{ id: 'n1' }])).toEqual([]);
  });

  test('handles null saved configs', () => {
    expect(findOrphanedConfigs(null, [{ id: 'n1' }])).toEqual([]);
  });
});
