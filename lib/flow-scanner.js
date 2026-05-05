'use strict';

function scanHttpInNodes(RED) {
  const nodes = [];
  RED.nodes.eachNode(function(node) {
    if (node.type === 'http in') {
      nodes.push({
        id: node.id,
        name: node.name || '',
        method: (node.method || 'get').toLowerCase(),
        url: node.url || '/',
        flowId: node.z || ''
      });
    }
  });
  return nodes;
}

function getFlowNames(RED) {
  const map = {};
  RED.nodes.eachNode(function(node) {
    if (node.type === 'tab') {
      map[node.id] = node.label || node.id;
    }
  });
  return map;
}

function findOrphanedConfigs(savedEndpoints, currentNodes) {
  const currentIds = new Set(currentNodes.map(n => n.id));
  return Object.keys(savedEndpoints || {}).filter(id => !currentIds.has(id));
}

module.exports = { scanHttpInNodes, getFlowNames, findOrphanedConfigs };
