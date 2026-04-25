import { useMemo, useCallback, useState, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { buildFlowSkeleton, NODE_COLORS } from '../utils/treeUtils'
import { useApp } from '../context/AppContext'
import CustomNode from './CustomNode'
import AnimatedEdge from './AnimatedEdge'

const nodeTypes = { domNode: CustomNode }
const edgeTypes = { animatedEdge: AnimatedEdge }

function TreeViewInner() {
  const {
    treeData,
    selectedNodes,
    lcaNodeId,
    renderTick,
    isNodeVisited,
    isNodeMatched,
    toggleSelectedNode,
  } = useApp()

  const [flowKey, setFlowKey] = useState(0)
  useEffect(() => {
    if (treeData) setFlowKey(prev => prev + 1)
  }, [treeData])

  const baseFlow = useMemo(() => {
    return buildFlowSkeleton(treeData)
  }, [treeData])

  const { nodes, edges } = useMemo(() => baseFlow, [baseFlow])

  const onNodeClick = useCallback((_, node) => {
    toggleSelectedNode(parseInt(node.id, 10))
  }, [toggleSelectedNode])

  const getMiniMapColor = useCallback((node) => {
    const nodeId = parseInt(node.id, 10)
    const tag = node?.data?.nodeData?.tag
    const parentId = node?.data?.parentId
    const isText = tag === '#text'

    let colorKey = isText ? 'text' : 'default'
    if (nodeId === lcaNodeId) colorKey = 'lca'
    else if (selectedNodes.includes(nodeId)) colorKey = 'selected'
    else if (isNodeMatched(nodeId)) colorKey = 'matched'
    else if (isNodeVisited(nodeId) && !isText) colorKey = 'visited'
    else if (isText && parentId != null && isNodeMatched(parentId)) colorKey = 'textAffected'

    return NODE_COLORS[colorKey]?.border ?? '#1a1a1a'
  }, [lcaNodeId, selectedNodes, isNodeMatched, isNodeVisited])

  void renderTick

  if (!treeData) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 8,
        fontFamily: "'Share Tech Mono', monospace",
      }}>
        <div style={{ color: '#E41F7B', fontSize: 20, opacity: 0.3 }}>
          {'> '}masukkan URL atau HTML, lalu klik RUN
        </div>
        <div style={{ color: '#FF8BA0', fontSize: 18, opacity: 0.15 }}>
          DOM tree akan muncul di sini
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        key={flowKey}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.05}
        maxZoom={2}
        style={{ width: '100%', height: '100%', background: '#080808' }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#111" gap={24} size={1} />
        <Controls
          showFitView={false}
          showInteractive={false}
          style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 4 }}
        />
        <MiniMap
          nodeColor={getMiniMapColor}
          style={{ background: '#080808', border: '1px solid #1a1a1a' }}
          maskColor="#08080899"
        />
      </ReactFlow>
    </div>
  )
}

export default function TreeView() {
  return (
    <ReactFlowProvider>
      <TreeViewInner />
    </ReactFlowProvider>
  )
}