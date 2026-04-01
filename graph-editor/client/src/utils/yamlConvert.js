const PIN_TO_PORT = { output: 'out', 'output-fail': 'fail', 'output-false': 'false', input: 'in' }
const PORT_TO_PIN = { out: 'output', fail: 'output-fail', false: 'output-false', in: 'input' }

function generateYamlId(node, usedIds) {
  let base
  if (node.type === 'comment') {
    base = 'comment'
  } else if (node.type === 'terminal') {
    base = node.name.toLowerCase()
  } else {
    base = node.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
  }
  if (!usedIds.has(base)) {
    usedIds.add(base)
    return base
  }
  let i = 2
  while (usedIds.has(`${base}_${i}`)) i++
  const id = `${base}_${i}`
  usedIds.add(id)
  return id
}

export function yamlToGraph(config) {
  if (!config) {
    return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
  }

  if (!config.graph || !Array.isArray(config.graph.nodes) || !Array.isArray(config.graph.edges)) {
    return null
  }

  const positions = config.ui?.node_positions || {}
  const viewport = config.ui?.viewport || { x: 0, y: 0, zoom: 1 }
  const yamlIdToNumericId = new Map()

  const comments = config.graph.comments || []
  const allYamlNodes = [...config.graph.nodes, ...comments.map((c) => ({ ...c, type: 'comment' }))]

  const nodes = allYamlNodes.map((n, i) => {
    const numericId = i + 1
    yamlIdToNumericId.set(n.id, numericId)
    const pos = positions[n.id] || { x: 100, y: 100 + i * 120 }
    const base = { id: numericId, yamlId: n.id, x: pos.x, y: pos.y }

    switch (n.type) {
      case 'start':
        return { ...base, type: 'terminal', name: 'Start', contractKeys: n.config?.keys || [] }
      case 'end':
        return { ...base, type: 'terminal', name: 'End', contractKeys: n.config?.keys || [] }
      case 'stage':
        return { ...base, type: 'stage', name: n.stage, retryCount: n.config?.retry || 0, onFailure: n.config?.on_failure || 'stop', consumerGroup: n.config?.consumer_group || '' }
      case 'condition':
        return {
          ...base,
          type: 'condition',
          name: n.stage,
          conditionKey: n.config?.key || '',
          conditionExpected: n.config?.expected || '',
        }
      case 'pipeline':
        return { ...base, type: 'pipeline', name: n.pipeline }
      case 'text':
        return { ...base, type: 'text', name: n.text || '' }
      case 'comment':
        return { ...base, type: 'comment', name: n.text || '', color: n.color || 'default' }
      default:
        return { ...base, type: n.type, name: n.id }
    }
  })

  let edgeId = 1
  const edges = []
  for (const e of config.graph.edges) {
    const fromId = yamlIdToNumericId.get(e.from?.node)
    const toId = yamlIdToNumericId.get(e.to?.node)
    if (fromId == null || toId == null) continue
    edges.push({
      id: edgeId++,
      fromNodeId: fromId,
      toNodeId: toId,
      fromPin: PORT_TO_PIN[e.from?.port] || 'output',
    })
  }

  return { nodes, edges, viewport }
}

export function graphToYaml(nodes, edges, camera) {
  const usedIds = new Set()
  const numericIdToYamlId = new Map()

  const commentNodes = nodes.filter((n) => n.type === 'comment')
  const regularNodes = nodes.filter((n) => n.type !== 'comment')

  // First pass: collect existing yamlIds
  for (const node of nodes) {
    if (node.yamlId) {
      usedIds.add(node.yamlId)
      numericIdToYamlId.set(node.id, node.yamlId)
    }
  }

  // Second pass: generate yamlIds for new nodes
  for (const node of nodes) {
    if (!node.yamlId) {
      const yamlId = generateYamlId(node, usedIds)
      numericIdToYamlId.set(node.id, yamlId)
    }
  }

  const yamlNodes = regularNodes.map((node) => {
    const yamlId = numericIdToYamlId.get(node.id)

    if (node.type === 'terminal') {
      const keys = (node.contractKeys || []).filter((k) => k.trim() !== '')
      return {
        id: yamlId,
        type: node.name === 'Start' ? 'start' : 'end',
        config: keys.length > 0 ? { keys } : {},
      }
    }
    if (node.type === 'stage') {
      const cfg = {}
      if (node.consumerGroup) cfg.consumer_group = node.consumerGroup
      if (node.retryCount > 0) cfg.retry = node.retryCount
      if (node.onFailure && node.onFailure !== 'stop') cfg.on_failure = node.onFailure
      return { id: yamlId, type: 'stage', stage: node.name, config: cfg }
    }
    if (node.type === 'condition') {
      const cfg = {}
      if (node.conditionKey) cfg.key = node.conditionKey
      if (node.conditionExpected) cfg.expected = node.conditionExpected
      return { id: yamlId, type: 'condition', stage: node.name, config: cfg }
    }
    if (node.type === 'pipeline') {
      return { id: yamlId, type: 'pipeline', pipeline: node.name, config: {} }
    }
    if (node.type === 'text') {
      return { id: yamlId, type: 'text', text: node.name, config: {} }
    }
    return { id: yamlId, type: node.type, config: {} }
  })

  const yamlComments = commentNodes.map((node) => {
    const yamlId = numericIdToYamlId.get(node.id)
    const comment = { id: yamlId, text: node.name }
    if (node.color && node.color !== 'default') comment.color = node.color
    return comment
  })

  const yamlEdges = edges.map((e) => ({
    from: {
      node: numericIdToYamlId.get(e.fromNodeId),
      port: PIN_TO_PORT[e.fromPin] || 'out',
    },
    to: {
      node: numericIdToYamlId.get(e.toNodeId),
      port: 'in',
    },
  })).filter((e) => e.from.node && e.to.node)

  const nodePositions = {}
  for (const node of nodes) {
    const yamlId = numericIdToYamlId.get(node.id)
    nodePositions[yamlId] = { x: Math.round(node.x), y: Math.round(node.y) }
  }

  return {
    graph: { nodes: yamlNodes, edges: yamlEdges, comments: yamlComments },
    ui: {
      viewport: {
        x: Math.round(camera.x),
        y: Math.round(camera.y),
        zoom: Math.round(camera.zoom * 100) / 100,
      },
      node_positions: nodePositions,
    },
  }
}
