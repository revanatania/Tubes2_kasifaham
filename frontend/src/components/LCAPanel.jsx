import { useApp } from '../context/AppContext'
import { queryLCA } from '../api/client'
import { buildNodeMap } from '../utils/treeUtils'
import { useMemo } from 'react'

const C = {
  purple: '#7F3994',
  orange: '#86003C',
}

export default function LCAPanel() {
  const {
    treeData, selectedNodes, lcaResult, setLcaResult, setError,
  } = useApp()

  const nodeMap = useMemo(() => buildNodeMap(treeData), [treeData])

  async function handleFindLCA() {
    if (selectedNodes.length < 2) return
    try {
      const result = await queryLCA({
        nodeIdA: selectedNodes[0],
        nodeIdB: selectedNodes[1],
      })
      setLcaResult(result)
    } catch (err) {
      setError('LCA error: ' + err.message)
    }
  }

  const disabled = selectedNodes.length < 2

  const tagA = nodeMap[selectedNodes[0]]?.tag
  const tagB = nodeMap[selectedNodes[1]]?.tag

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      padding: '10px 12px', height: '100%',
      fontFamily: "'Share Tech Mono', monospace",
    }}>
      <div style={{ fontSize: 9, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        klik 2 node di tree untuk memilih
      </div>

      {/* Selected nodes — warna sama (orange) untuk keduanya */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <NodePill label="node A" tag={tagA} nodeId={selectedNodes[0]} />
        <span style={{ color: '#888', fontSize: 14 }}>+</span>
        <NodePill label="node B" tag={tagB} nodeId={selectedNodes[1]} />
      </div>

      {/* Tombol cari LCA */}
      <button
        onClick={handleFindLCA}
        disabled={disabled}
        style={{
          padding: '6px 0',
          fontFamily: "'Orbitron', monospace",
          fontSize: 10, letterSpacing: '0.12em',
          border: `1px solid ${disabled ? '#444' : C.purple}`,
          background: disabled ? '#0a0a0a' : '#0d001a',
          color: disabled ? '#888' : C.purple,
          borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: disabled ? 'none' : `0 0 8px ${C.purple}44`,
          transition: 'all 0.2s',
        }}
      >
        ◈ CARI LCA
      </button>

      {/* Hasil LCA — tampilkan tag saja */}
      {lcaResult && (
        <div style={{
          background: '#0d001a',
          border: `1px solid ${C.purple}`,
          borderRadius: 4, padding: '8px 10px',
          boxShadow: `0 0 12px ${C.purple}33`,
        }}>
          <div style={{
            fontSize: 9, color: C.purple, letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 4,
          }}>
            lowest common ancestor
          </div>
          <div style={{ fontSize: 14, color: '#df80ff', textShadow: `0 0 8px ${C.purple}` }}>
            &lt;{lcaResult.lcaNode?.tag}&gt;
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 16 }}>
            <DepthInfo label="depth A"  value={lcaResult.depthA}   />
            <DepthInfo label="depth B"   value={lcaResult.depthB}   />
            <DepthInfo label="depth LCA" value={lcaResult.depthLca} />
          </div>
        </div>
      )}
    </div>
  )
}

function NodePill({ label, tag, nodeId }) {
  const hasNode = nodeId != null
  return (
    <div style={{
      flex: 1, background: '#0a0a0a',
      border: `1px solid ${hasNode ? C.orange : '#444'}`,
      borderRadius: 4, padding: '5px 8px',
      boxShadow: hasNode ? `0 0 6px ${C.orange}33` : 'none',
    }}>
      <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: hasNode ? C.orange : '#888' }}>
        {hasNode ? `<${tag}>` : '—'}
      </div>
    </div>
  )
}

function DepthInfo({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#7F3994', fontFamily: "'Orbitron', monospace" }}>{value}</div>
    </div>
  )
}