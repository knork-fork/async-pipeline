const TYPE_ORDER = { stage: 0, condition: 1, terminal: 2 }

function formatTarget(node) {
  if (node.type === 'stage') return `Stage: ${node.name}`
  if (node.type === 'condition') return `Condition: ${node.name}`
  if (node.type === 'terminal') return `Terminal: ${node.name}`
  return node.name
}

export function generateSpec(nodes, edges, pipelineName) {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  // Build lookup: actionId -> [sourceNodeId, ...]
  const actionSources = new Map()
  for (const edge of edges) {
    const from = nodeById.get(edge.fromNodeId)
    const to = nodeById.get(edge.toNodeId)
    if (!from || !to) continue
    if (to.type !== 'text') continue
    if (!actionSources.has(to.id)) actionSources.set(to.id, [])
    actionSources.get(to.id).push(from)
  }

  // Collect action nodes sorted by id
  const actions = nodes
    .filter((n) => n.type === 'text' && n.name.trim())
    .sort((a, b) => a.id - b.id)

  if (actions.length === 0) return ''

  const lines = []
  lines.push(`Pipeline: ${pipelineName}`)
  lines.push('')

  actions.forEach((action, i) => {
    lines.push(`${i + 1}. ${action.name}`)

    const sources = actionSources.get(action.id)
    if (!sources || sources.length === 0) {
      lines.push('   (Apply without specific stage/condition restrictions)')
    } else {
      const sorted = [...sources].sort((a, b) => {
        const typeDiff = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99)
        if (typeDiff !== 0) return typeDiff
        return (a.name || '').localeCompare(b.name || '')
      })
      for (const src of sorted) {
        lines.push(`   - ${formatTarget(src)}`)
      }
    }

    lines.push('')
  })

  return lines.join('\n').trimEnd() + '\n'
}
