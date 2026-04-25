import { useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'

const neon = {
  green:  '#E41F7B',
  blue:   '#FF8BA0',
  purple: '#7F3994',
  orange: '#86003C',
}

function StatCard({ value, label, color }) {
  return (
    <div style={{
      background: '#0d0d0d',
      border: `1px solid ${color}33`,
      borderRadius: 4,
      padding: '8px 12px',
      textAlign: 'center',
      minWidth: 70,
      flex: 1,
    }}>
      <div style={{
        fontSize: 20, fontWeight: 500, color,
        fontFamily: "'Orbitron', monospace",
        textShadow: `0 0 10px ${color}88`,
      }}>{value}</div>
      <div style={{
        fontSize: 9, color: '#666', marginTop: 2,
        fontFamily: "'Share Tech Mono', monospace",
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>{label}</div>
    </div>
  )
}

export default function TraversalPanel() {
  const {
    visitedCount, matchedCount, traversalLog,
    traversalResult, isTraversing,
  } = useApp()

  const logRef = useRef(null)

  // Auto-scroll log ke bawah setiap ada step baru
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [traversalLog])

  const timeMs = traversalResult
    ? traversalResult.elapsedMs?.toFixed(2) + 'ms'
    : isTraversing ? '...' : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', borderBottom: '1px solid #111' }}>
        <StatCard value={visitedCount} label="dikunjungi" color={neon.blue} />
        <StatCard value={matchedCount} label="cocok"      color={neon.green} />
        <StatCard value={timeMs}            label="waktu"      color={neon.purple} />
      </div>

      {/* Traversal log */}
      <div
        ref={logRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 12px',
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 11,
          lineHeight: 1.8,
        }}
      >
        {traversalLog.length === 0 ? (
          <div style={{ color: '#333', fontSize: 10, paddingTop: 4 }}>
            log kosong
          </div>
        ) : (
          traversalLog.filter(step => step.tag !== '#text').map((step, i) => {
            const num = String(i + 1).padStart(2, '0')
            return (
              <div
                key={i}
                style={{
                  color: step.matched ? neon.green : '#333',
                  textShadow: step.matched ? `0 0 6px ${neon.green}88` : 'none',
                }}
              >
                <span style={{ color: step.matched ? neon.green : '#888' }}>[</span>
                <span style={{ color: step.matched ? neon.green : '#888' }}>{num}</span>
                <span style={{ color: step.matched ? neon.green : '#888' }}>]</span>
                {' '}
                <span style={{ color: step.matched ? neon.green : '#888' }}>&lt;</span>
                <span style={{ color: step.matched ? neon.green : '#888' }}>{step.tag}</span>
                <span style={{ color: step.matched ? neon.green : '#888' }}>&gt;</span>
                {step.matched && (
                  <span style={{ color: neon.green, marginLeft: 6, fontSize: 10 }}>✓</span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
