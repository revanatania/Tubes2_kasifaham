import { Handle, Position } from 'reactflow'
import { NODE_COLORS } from '../utils/treeUtils'
import { useApp } from '../context/AppContext'

export default function CustomNode({ data, id }) {
  const {
    animationEnabled,
    activeNodeId,
    selectedNodes,
    lcaNodeId,
    renderTick,
    isNodeVisited,
    isNodeMatched,
  } = useApp()
  const { typeLabel, content, nodeData, parentId } = data

  const nodeId = parseInt(id, 10)
  const isActive = animationEnabled && activeNodeId === nodeId
  const isSelected = selectedNodes.includes(nodeId)
  const isLCA = lcaNodeId === nodeId
  const isMatched = isNodeMatched(nodeId)
  const isVisited = isNodeVisited(nodeId)
  const isText = nodeData?.tag === '#text'
  const parentIsMatched = parentId != null && isNodeMatched(parentId)

  void renderTick

  let colorKey = isText ? 'text' : 'default'
  if (isLCA) colorKey = 'lca'
  else if (isSelected) colorKey = 'selected'
  else if (isMatched) colorKey = 'matched'
  else if (isVisited && !isText) colorKey = 'visited'
  else if (isText && parentIsMatched) colorKey = 'textAffected'

  const effectiveKey = isActive
    ? (colorKey === 'matched' ? 'matched' : 'visited')
    : colorKey
  const c = NODE_COLORS[effectiveKey] ?? NODE_COLORS.default

  return (
    <div style={{
      width: 130,
      height: 52,
      position: 'relative',
      cursor: 'pointer',
    }}>
      <Handle type="target" position={Position.Top}
        style={{ background: c.border, width: 6, height: 6, border: 'none' }} />

      <div style={{
        position: 'absolute',
        inset: 0,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: '4px 8px',
        boxShadow: effectiveKey !== 'default' && effectiveKey !== 'text' ? `0 0 12px ${c.border}66` : 'none',
        transform: isActive ? 'scale(1.28)' : 'scale(1)',
        transition: isActive
          ? 'transform 0.14s ease-out, box-shadow 0.1s'
          : 'transform 0.18s ease-in, background 0.2s, border-color 0.2s, box-shadow 0.2s',
        zIndex: isActive ? 10 : 1,
      }}>
        <div style={{
          fontSize: 9,
          fontFamily: "'Share Tech Mono', monospace",
          color: c.label,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}>
          {typeLabel}
        </div>

        <div style={{
          fontSize: 15,
          fontFamily: "'Share Tech Mono', monospace",
          color: c.text,
          fontWeight: 500,
          lineHeight: 1,
          textShadow: effectiveKey !== 'default' && effectiveKey !== 'text' ? `0 0 6px ${c.border}88` : 'none',
          maxWidth: 118,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}>
          {content}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom}
        style={{ background: c.border, width: 6, height: 6, border: 'none' }} />
    </div>
  )
}