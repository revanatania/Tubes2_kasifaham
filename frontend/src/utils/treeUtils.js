import dagre from 'dagre'

const NODE_W = 130
const NODE_H = 52

export const NODE_COLORS = {
  default:  { bg: '#0a0a0a', border: '#777', label: '#888', text: '#999' },
  visited:  { bg: '#1a0010', border: '#FF8BA0', label: '#FF8BA0', text: '#FF8BA0' },
  matched:  { bg: '#1a0010', border: '#E41F7B', label: '#E41F7B', text: '#E41F7B' },
  active:   { bg: '#1a0010', border: '#FF8BA0', label: '#FF8BA0', text: '#FF8BA0' },
  selected: { bg: '#1a0010', border: '#86003C', label: '#86003C', text: '#c0406a' },
  lca:      { bg: '#0f000f', border: '#7F3994', label: '#7F3994', text: '#c890e8' },
  text:     { bg: '#0a0a0a', border: '#444', label: '#555', text: '#666' },
  attr:     { bg: '#0a0a0a', border: '#3a003a', label: '#7F3994', text: '#c890e8' },
}

export function flattenTree(node, result = []) {
  if (!node) return result
  result.push(node)
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) flattenTree(child, result)
  }
  return result
}

export function buildNodeMap(root) {
  const map = {}
  flattenTree(root).forEach(n => { map[n.id] = n })
  return map
}

function getNodeKind(node) {
  if (node.tag === '#text') return 'text'
  return 'element'
}

function getNodeTypeLabel(node) {
  if (node.tag === '#text') return 'Text:'
  if (node.depth === 0) return 'Root element:'
  return 'Element:'
}

function getNodeContent(node) {
  if (node.tag === '#text') {
    const text = node.textContent || ''
    const t = text.slice(0, 18)
    return `"${t}${text.length > 18 ? '...' : ''}"`
  }
  return `<${node.tag}>`
}

function resolveColorKey(node, visitedSet, matchedSet, selectedSet, lcaNodeId) {
  const kind = getNodeKind(node)
  const isMatched = matchedSet.has(node.id)
  const isVisited = visitedSet.has(node.id)
  const isSelected = selectedSet.has(node.id)
  const isLCA = node.id === lcaNodeId

  let colorKey = kind === 'text' ? 'text' : 'default'
  if (isLCA) colorKey = 'lca'
  else if (isSelected) colorKey = 'selected'
  else if (isMatched) colorKey = 'matched'
  else if (isVisited && kind !== 'text') colorKey = 'visited'
  return colorKey
}

export function buildFlowSkeleton(root) {
  if (!root) return { nodes: [], edges: [] }

  const rfNodes = []
  const rfEdges = []

  function walk(node) {
    if (!node || node.id == null) return

    rfNodes.push({
      id: String(node.id),
      type: 'domNode',
      data: {
        typeLabel: getNodeTypeLabel(node),
        content: getNodeContent(node),
        colorKey: getNodeKind(node) === 'text' ? 'text' : 'default',
        nodeData: node,
      },
      position: { x: 0, y: 0 },
    })

    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (!child || child.id == null) continue
        rfEdges.push({
          id: `e${node.id}-${child.id}`,
          source: String(node.id),
          target: String(child.id),
          type: 'animatedEdge',
          style: { stroke: '#1a1a1a', strokeWidth: 1 },
        })
        walk(child)
      }
    }
  }

  walk(root)
  if (rfNodes.length === 0) return { nodes: [], edges: [] }
  return applyDagreLayout(rfNodes, rfEdges)
}

export function applyFlowState(baseFlow, visitedIds = [], matchedIds = [], selectedNodes = [], lcaNodeId = null) {
  if (!baseFlow || baseFlow.nodes.length === 0) return { nodes: [], edges: [] }

  const visitedSet = new Set(visitedIds)
  const matchedSet = new Set(matchedIds)
  const selectedSet = new Set(selectedNodes)

  const nodes = baseFlow.nodes.map(n => {
    const colorKey = resolveColorKey(n.data.nodeData, visitedSet, matchedSet, selectedSet, lcaNodeId)
    return {
      ...n,
      data: {
        ...n.data,
        colorKey,
      },
    }
  })

  const edges = baseFlow.edges.map(e => {
    const sourceId = parseInt(e.source, 10)
    const targetId = parseInt(e.target, 10)
    const isVisitedEdge = visitedSet.has(sourceId) && visitedSet.has(targetId)

    return {
      ...e,
      style: {
        ...e.style,
        stroke: isVisitedEdge ? '#FF8BA033' : '#1a1a1a',
        strokeWidth: 1,
      },
    }
  })

  return { nodes, edges }
}

// Backward-compatible helper (masih dipakai jika ada import lama)
export function treeToFlow(root, visitedIds = [], matchedIds = [], selectedNodes = [], lcaNodeId = null) {
  const baseFlow = buildFlowSkeleton(root)
  return applyFlowState(baseFlow, visitedIds, matchedIds, selectedNodes, lcaNodeId)
}

function applyDagreLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 50, nodesep: 16 })

  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  edges.forEach(e => g.setEdge(e.source, e.target))
  dagre.layout(g)

  return {
    nodes: nodes.map(n => {
      const pos = g.node(n.id)
      if (!pos) return n
      return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } }
    }),
    edges,
  }
}
