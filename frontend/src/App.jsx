import { useState } from 'react'
import { useApp } from './context/AppContext'
import InputForm from './components/InputForm'
import TreeView from './components/TreeView'
import TraversalPanel from './components/TraversalPanel'
import LCAPanel from './components/LCAPanel'

const SIDEBAR_W = 230
const BOTTOM_H  = 220

const TAB_STYLE = (on) => ({
  padding: '6px 14px',
  fontSize: 10,
  fontFamily: "'Share Tech Mono', monospace",
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  outline: 'none',
  color: on ? '#E41F7B' : '#555',
  borderBottom: on ? '1px solid #E41F7B' : '1px solid transparent',
  transition: 'all 0.15s',
})

export default function App() {
  const { treeData, nodeCount, maxDepth, error, isTraversing } = useApp()
  const [activeTab, setActiveTab] = useState('log')

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#080808',
      color: '#ccc',
      overflow: 'hidden',
    }}>

      <div style={{
        width: SIDEBAR_W,
        flexShrink: 0,
        background: '#0a0a0a',
        borderRight: '1px solid #111',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 14px 10px',
          borderBottom: '1px solid #111',
        }}>
          <div style={{
            fontSize: 13,
            fontFamily: "'Orbitron', monospace",
            color: '#E41F7B',
            letterSpacing: '0.08em',
            textShadow: '0 0 10px #E41F7B66',
          }}>DOM TREE TRAVERSAL</div>
          <div style={{
            fontSize: 9, color: '#666',
            fontFamily: "'Share Tech Mono', monospace",
            marginTop: 2, letterSpacing: '0.1em',
          }}>BFS / DFS / LCA</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
          <InputForm />
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            background: '#1a0000',
            borderTop: '1px solid #ff333344',
            fontSize: 10,
            fontFamily: "'Share Tech Mono', monospace",
            color: '#ff5555',
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}>
            ✗ {error}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{
          padding: '6px 14px',
          background: '#0a0a0a',
          borderBottom: '1px solid #111',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 11, color: '#222', flex: 1,
          }}>
            {treeData ? (
              <span style={{ color: '#FF8BA0' }}>
                {nodeCount} nodes &nbsp;·&nbsp;
                <span style={{ color: '#FF8BA0' }}>max depth </span>
                <span style={{ color: '#FF8BA0' }}>{maxDepth}</span>
              </span>
            ) : (
              '—'
            )}
          </span>

          {isTraversing && (
            <span style={{
              fontSize: 9, color: '#E41F7B',
              fontFamily: "'Share Tech Mono', monospace",
              letterSpacing: '0.1em',
              animation: 'pulse 1s ease-in-out infinite',
            }}>
              ● traversing...
            </span>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            {[
              ['visited', '#FF8BA0'],
              ['match',   '#E41F7B'],
              ['selected','#86003C'],
              ['lca',     '#7F3994'],
            ].map(([lbl, clr]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: clr, boxShadow: `0 0 4px ${clr}` }} />
                <span style={{ fontSize: 9, color: '#666', fontFamily: "'Share Tech Mono', monospace" }}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <TreeView />
          </div>
        </div>

        <div style={{
          height: BOTTOM_H,
          flexShrink: 0,
          background: '#0a0a0a',
          borderTop: '1px solid #111',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #111',
            flexShrink: 0,
          }}>
            <button style={TAB_STYLE(activeTab === 'log')} onClick={() => setActiveTab('log')}>
              traversal log
            </button>
            <button style={TAB_STYLE(activeTab === 'lca')} onClick={() => setActiveTab('lca')}>
              lca
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {activeTab === 'log' && <TraversalPanel />}
            {activeTab === 'lca' && <LCAPanel />}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #2a2a2a; }
        * { box-sizing: border-box; }
        .react-flow__controls button {
          background: #0d0d0d !important;
          border: 1px solid #1a1a1a !important;
          color: #444 !important;
        }
        .react-flow__controls button:hover {
          background: #1a1a1a !important;
          color: #E41F7B !important;
        }
        .react-flow__attribution { display: none; }
      `}</style>
    </div>
  )
}