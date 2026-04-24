import { BaseEdge, getSmoothStepPath } from 'reactflow'
import { useApp } from '../context/AppContext'
import { useEffect, useRef } from 'react'

export default function AnimatedEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, source, target }) {
  const {
    animationEnabled,
    flowingEdge,
    renderTick,
    isNodeVisited,
    isEdgeGlowed,
  } = useApp()
  const pathRef = useRef(null)
  const rafRef  = useRef(null)

  const fromId    = parseInt(source, 10)
  const toId      = parseInt(target, 10)
  const isFlowing = animationEnabled && flowingEdge?.from === fromId && flowingEdge?.to === toId
  const isGlowed  = isEdgeGlowed(fromId, toId)
  const isVisitedEdge = isNodeVisited(fromId) && isNodeVisited(toId)

  // gunakan renderTick agar edge merefresh status visited/glow dari lookup refs.
  void renderTick

  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
  })

  useEffect(() => {
    if (!animationEnabled || !isFlowing || !pathRef.current) return

    const el = pathRef.current
    let len = 200
    try { len = el.getTotalLength() } catch(e) {}

    el.style.strokeDasharray  = len
    el.style.strokeDashoffset = len
    el.style.display = 'block'

    const start = performance.now()
    const duration = 500

    function frame(now) {
      const t = Math.min((now - start) / duration, 1)
      el.style.strokeDashoffset = len * (1 - t)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame)
      }
    }

    rafRef.current = requestAnimationFrame(frame)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [animationEnabled, isFlowing, flowingEdge])

  const lit = isFlowing || isGlowed
  const showOverlay = animationEnabled && lit

  return (
    <>
      <BaseEdge path={edgePath} style={{
        stroke: lit ? '#FF8BA0' : (isVisitedEdge ? '#FF8BA033' : '#222'),
        strokeWidth: lit ? 2 : (isVisitedEdge ? 1.8 : 1.5),
        transition: 'stroke 0.3s, stroke-width 0.3s',
      }} />
      <path
        ref={pathRef}
        d={edgePath}
        fill="none"
        stroke="#FF8BA0"
        strokeWidth="3"
        strokeLinecap="round"
        style={{
          display: showOverlay ? 'block' : 'none',
          strokeDasharray: isGlowed && !isFlowing ? 'none' : undefined,
          strokeDashoffset: isGlowed && !isFlowing ? 0 : undefined,
          opacity: isFlowing ? 1 : 0.5,
          filter: isFlowing ? 'drop-shadow(0 0 4px #FF8BA0)' : 'none',
          transition: 'opacity 0.3s',
        }}
      />
    </>
  )
}
