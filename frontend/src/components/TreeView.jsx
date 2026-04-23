import { useMemo, useCallback, useState, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { treeToFlow, NODE_COLORS } from '../utils/treeUtils'
import { useApp } from '../context/AppContext'
import CustomNode from './CustomNode'
import AnimatedEdge from './AnimatedEdge'

const nodeTypes = { domNode: CustomNode }
const edgeTypes = { animatedEdge: AnimatedEdge }

function TreeViewInner() {
  const {
    treeData,
    visitedIds,
    matchedIds,
    selectedNodes,
    lcaNodeId,
    toggleSelectedNode,
  } = useApp()

  const [flowKey, setFlowKey] = useState(0)
  useEffect(() => {
    if (treeData) setFlowKey(prev => prev + 1)
  }, [treeData])

  const { nodes, edges } = useMemo(() => {
    const result = treeToFlow(treeData, visitedIds, matchedIds, selectedNodes, lcaNodeId)
    return {
      nodes: result.nodes,
      edges: result.edges.map(e => ({ ...e, type: 'animatedEdge' })),
    }
  }, [treeData, visitedIds, matchedIds, selectedNodes, lcaNodeId])

  const onNodeClick = useCallback((_, node) => {
    toggleSelectedNode(parseInt(node.id))
  }, [toggleSelectedNode])

  if (!treeData) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 8,
        fontFamily: "'Share Tech Mono', monospace",
      }}>
        <div style={{ color: '#E41F7B', fontSize: 11, opacity: 0.3 }}>
          {'> '}masukkan URL atau HTML, lalu klik RUN
        </div>
        <div style={{ color: '#FF8BA0', fontSize: 10, opacity: 0.15 }}>
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
        <Controls style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: 4 }} />
        <MiniMap
          nodeColor={node => NODE_COLORS[node.data?.colorKey]?.border ?? '#1a1a1a'}
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