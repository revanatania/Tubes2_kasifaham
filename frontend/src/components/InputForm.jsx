import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { traverseSSE } from '../api/client'

const S = {
  label: {
    fontSize: 10, color: '#777', letterSpacing: '0.12em',
    textTransform: 'uppercase', fontFamily: "'Share Tech Mono', monospace",
    marginBottom: 4, display: 'block',
  },
  input: {
    width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a',
    color: '#ccc', padding: '6px 8px', borderRadius: 4, fontSize: 11,
    fontFamily: "'Share Tech Mono', monospace", outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a',
    color: '#ccc', padding: '6px 8px', borderRadius: 4, fontSize: 11,
    fontFamily: "'Share Tech Mono', monospace", outline: 'none',
    resize: 'vertical', minHeight: 80, boxSizing: 'border-box',
  },
  toggle: {
    display: 'flex', background: '#0d0d0d',
    border: '1px solid #2a2a2a', borderRadius: 4, overflow: 'hidden',
  },
  toggleBtn: (on) => ({
    flex: 1, padding: '5px 0', fontSize: 10, cursor: 'pointer',
    fontFamily: "'Share Tech Mono', monospace", letterSpacing: '0.08em',
    border: 'none', outline: 'none',
    background: on ? '#FF8BA0' : 'transparent',
    color: on ? '#000' : '#555',
    transition: 'all 0.2s',
  }),
  select: {
    width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a',
    color: '#ccc', padding: '6px 8px', borderRadius: 4, fontSize: 11,
    fontFamily: "'Share Tech Mono', monospace", outline: 'none',
    boxSizing: 'border-box',
  },
  divider: {
    borderTop: '1px solid #151515', paddingTop: 12, marginTop: 4,
  },
}

export default function InputForm() {
  const {
    setTreeData, setNodeCount, setMaxDepth,
    animationEnabled, setAnimationEnabled,
    setIsTraversing, isTraversing,
    resetTraversal, addVisitedNode,
    setTraversalResult, setError,
  } = useApp()

  const [mode, setMode]           = useState('url')
  const [url, setUrl]             = useState('')
  const [html, setHtml]           = useState('')
  const [algo, setAlgo]           = useState('BFS')
  const [selector, setSelector]   = useState('')
  const [limitMode, setLimitMode] = useState('all')
  const [topN, setTopN]           = useState(5)

  const abortRef = useRef(null)

  function handleRun() {
    if (isTraversing) return
    setError(null)
    resetTraversal()
    setIsTraversing(true)

    const limit = limitMode === 'n' ? Math.max(1, topN) : 0
    const body = { algorithm: algo, selector: selector.trim(), limit }
    if (mode === 'url') body.url = url.trim()
    else body.rawHtml = html

    abortRef.current = traverseSSE(body, (type, payload) => {
      if (type === 'tree') {
        setTreeData(payload.tree)
        setNodeCount(payload.nodeCount)
        setMaxDepth(payload.maxDepth)
      } else if (type === 'step') {
        addVisitedNode(payload)
      } else if (type === 'result') {
        setTraversalResult(payload)
        setIsTraversing(false)
      } else if (type === 'error') {
        setError(String(payload))
        setIsTraversing(false)
      } else if (type === 'done') {
        setIsTraversing(false)
      }
    })
  }

  function handleStop() {
    abortRef.current?.()
    setIsTraversing(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <span style={S.label}>input</span>
        <div style={S.toggle}>
          <button style={S.toggleBtn(mode === 'url')}  onClick={() => setMode('url')}>URL</button>
          <button style={S.toggleBtn(mode === 'html')} onClick={() => setMode('html')}>HTML</button>
        </div>
      </div>

      {mode === 'url' ? (
        <input
          style={S.input}
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder=""
          spellCheck={false}
        />
      ) : (
        <textarea
          style={S.textarea}
          value={html}
          onChange={e => setHtml(e.target.value)}
          placeholder=""
          spellCheck={false}
        />
      )}

      <div style={S.divider}>
        <span style={S.label}>algoritma</span>
        <select style={S.select} value={algo} onChange={e => setAlgo(e.target.value)}>
          <option value="BFS">BFS — Breadth First Search</option>
          <option value="DFS">DFS — Depth First Search</option>
        </select>
      </div>

      <div>
        <span style={S.label}>css selector</span>
        <input
          style={S.input}
          value={selector}
          onChange={e => setSelector(e.target.value)}
          placeholder=".class / #id / tag"
          spellCheck={false}
        />
      </div>

      <div>
        <span style={S.label}>jumlah hasil</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            style={{ ...S.select, flex: 1 }}
            value={limitMode}
            onChange={e => setLimitMode(e.target.value)}
          >
            <option value="all">semua</option>
            <option value="n">top n</option>
          </select>

          {limitMode === 'n' && (
            <div style={{
              display: 'flex', alignItems: 'center',
              border: '1px solid #2a2a2a', borderRadius: 4,
              overflow: 'hidden', flexShrink: 0,
            }}>
              <button
                onClick={() => setTopN(v => Math.max(1, v - 1))}
                style={{
                  width: 26, height: 32, background: '#0d0d0d',
                  border: 'none', borderRight: '1px solid #2a2a2a',
                  color: '#666', cursor: 'pointer', fontSize: 16,
                  fontFamily: 'monospace', lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >−</button>
              <span style={{
                width: 32, textAlign: 'center', fontSize: 11,
                fontFamily: "'Share Tech Mono', monospace",
                color: '#ccc', userSelect: 'none', background: '#0d0d0d',
                lineHeight: '32px',
              }}>
                {topN}
              </span>
              <button
                onClick={() => setTopN(v => v + 1)}
                style={{
                  width: 26, height: 32, background: '#0d0d0d',
                  border: 'none', borderLeft: '1px solid #2a2a2a',
                  color: '#666', cursor: 'pointer', fontSize: 16,
                  fontFamily: 'monospace', lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
          )}
        </div>
      </div>

      <div>
        <span style={S.label}>animasi traversal</span>
        <div style={S.toggle}>
          <button
            disabled={isTraversing}
            style={{
              ...S.toggleBtn(animationEnabled),
              opacity: isTraversing ? 0.6 : 1,
              cursor: isTraversing ? 'not-allowed' : 'pointer',
            }}
            onClick={() => setAnimationEnabled(true)}
          >
            ON
          </button>
          <button
            disabled={isTraversing}
            style={{
              ...S.toggleBtn(!animationEnabled),
              opacity: isTraversing ? 0.6 : 1,
              cursor: isTraversing ? 'not-allowed' : 'pointer',
            }}
            onClick={() => setAnimationEnabled(false)}
          >
            OFF
          </button>
        </div>
        <div style={{
          marginTop: 4,
          fontSize: 9,
          color: '#666',
          fontFamily: "'Share Tech Mono', monospace",
          letterSpacing: '0.04em',
          lineHeight: 1.4,
        }}>
        </div>
      </div>

      <div style={{ marginTop: 4 }}>
        {isTraversing ? (
          <button onClick={handleStop} style={{
            width: '100%', padding: '8px 0', fontSize: 11,
            fontFamily: "'Orbitron', monospace", letterSpacing: '0.12em',
            border: '1px solid #ff3333', background: '#1a0000',
            color: '#ff3333', borderRadius: 4, cursor: 'pointer',
          }}>
            ■ STOP
          </button>
        ) : (
          <button onClick={handleRun} style={{
            width: '100%', padding: '8px 0', fontSize: 11,
            fontFamily: "'Orbitron', monospace", letterSpacing: '0.12em',
            border: '1px solid #E41F7B', background: '#1a0010',
            color: '#E41F7B', borderRadius: 4, cursor: 'pointer',
            boxShadow: '0 0 10px #E41F7B33',
          }}>
            ▶ RUN
          </button>
        )}
      </div>
    </div>
  )
}
