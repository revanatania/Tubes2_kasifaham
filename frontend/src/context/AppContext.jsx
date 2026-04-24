import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [treeData, setTreeData]               = useState(null)
  const [nodeCount, setNodeCount]             = useState(0)
  const [maxDepth, setMaxDepth]               = useState(0)
  const [animationEnabled, setAnimationEnabled] = useState(true)
  const [visitedCount, setVisitedCount]       = useState(0)
  const [matchedCount, setMatchedCount]       = useState(0)
  const [traversalLog, setTraversalLog]       = useState([])
  const [traversalResult, setTraversalResult] = useState(null)
  const [isTraversing, setIsTraversing]       = useState(false)
  const [selectedNodes, setSelectedNodes]     = useState([])
  const [lcaResult, setLcaResult]             = useState(null)
  const [error, setError]                     = useState(null)
  const [activeNodeId, setActiveNodeId]       = useState(null)
  const [flowingEdge, setFlowingEdge]         = useState(null)
  const [renderTick, setRenderTick]           = useState(0)

  const stepQueueRef  = useRef([])
  const processingRef = useRef(false)
  const visitedSetRef = useRef(new Set())
  const matchedSetRef = useRef(new Set())
  const glowedSetRef  = useRef(new Set())
  const rafRef        = useRef(null)
  const clearFxRef    = useRef(null)
  const processTimerRef = useRef(null)

  const MAX_LOG_ENTRIES = 4000
  const EDGE_MS = 400
  const NODE_MS = 300
  const PAUSE_MS = 40

  const clearRuntimeTimers = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (clearFxRef.current != null) {
      clearTimeout(clearFxRef.current)
      clearFxRef.current = null
    }
    if (processTimerRef.current != null) {
      clearTimeout(processTimerRef.current)
      processTimerRef.current = null
    }
  }, [])

  function resetTraversal() {
    clearRuntimeTimers()

    setVisitedCount(0)
    setMatchedCount(0)
    setTraversalLog([])
    setTraversalResult(null)
    setSelectedNodes([])
    setLcaResult(null)
    setError(null)
    setActiveNodeId(null)
    setFlowingEdge(null)
    visitedSetRef.current = new Set()
    matchedSetRef.current = new Set()
    glowedSetRef.current  = new Set()
    setRenderTick(t => t + 1)
    stepQueueRef.current  = []
    processingRef.current = false
  }

  const getBatchSize = useCallback((queueLen) => {
    if (queueLen > 8000) return 900
    if (queueLen > 3000) return 500
    if (queueLen > 1200) return 260
    if (queueLen > 400) return 120
    if (queueLen > 120) return 45
    return 12
  }, [])

  const popNextRenderableStep = useCallback(() => {
    while (stepQueueRef.current.length > 0) {
      const step = stepQueueRef.current.shift()
      if (step && step.tag !== '#text') return step
    }
    return null
  }, [])

  const commitSteps = useCallback((steps, addGlowEdges) => {
    if (!steps || steps.length === 0) return

    let visitedAdded = 0
    let matchedAdded = 0
    let visualChanged = false
    const newLogEntries = []

    for (const step of steps) {
      newLogEntries.push(step)

      if (!visitedSetRef.current.has(step.nodeId)) {
        visitedSetRef.current.add(step.nodeId)
        visitedAdded++
        visualChanged = true
      }
      if (step.matched && !matchedSetRef.current.has(step.nodeId)) {
        matchedSetRef.current.add(step.nodeId)
        matchedAdded++
        visualChanged = true
      }

      if (addGlowEdges) {
        const path = step.pathFromRoot || []
        const parentId = path.length >= 2 ? path[path.length - 2] : null
        if (parentId !== null) {
          glowedSetRef.current.add(`${parentId}-${step.nodeId}`)
          visualChanged = true
        }
      }
    }

    if (visitedAdded > 0) setVisitedCount(v => v + visitedAdded)
    if (matchedAdded > 0) setMatchedCount(v => v + matchedAdded)
    if (newLogEntries.length > 0) {
      setTraversalLog(prev => {
        const next = [...prev, ...newLogEntries]
        if (next.length > MAX_LOG_ENTRIES) {
          return next.slice(next.length - MAX_LOG_ENTRIES)
        }
        return next
      })
      visualChanged = true
    }
    if (visualChanged) {
      setRenderTick(t => t + 1)
    }
  }, [])

  const processFastQueue = useCallback(() => {
    if (!processingRef.current) return

    if (stepQueueRef.current.length === 0) {
      processingRef.current = false
      setActiveNodeId(null)
      setFlowingEdge(null)
      return
    }

    const queueLen = stepQueueRef.current.length
    const batchSize = getBatchSize(queueLen)

    const steps = []
    let processed = 0

    while (processed < batchSize && stepQueueRef.current.length > 0) {
      const step = popNextRenderableStep()
      processed++
      if (step) steps.push(step)
    }

    commitSteps(steps, true)
    setActiveNodeId(null)
    setFlowingEdge(null)

    if (stepQueueRef.current.length > 0) {
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          processFastQueue()
        })
      }
    } else {
      processingRef.current = false
    }
  }, [commitSteps, getBatchSize, popNextRenderableStep])

  const processAnimatedStep = useCallback(() => {
    if (!processingRef.current) return

    const step = popNextRenderableStep()
    if (!step) {
      processingRef.current = false
      setActiveNodeId(null)
      setFlowingEdge(null)
      return
    }

    const path = step.pathFromRoot || []
    const parentId = path.length >= 2 ? path[path.length - 2] : null
    if (parentId !== null) {
      setFlowingEdge({ from: parentId, to: step.nodeId })
    } else {
      setFlowingEdge(null)
    }

    const edgeDelay = parentId !== null ? EDGE_MS : 0
    processTimerRef.current = setTimeout(() => {
      if (!processingRef.current) return

      if (parentId !== null) {
        glowedSetRef.current.add(`${parentId}-${step.nodeId}`)
        setRenderTick(t => t + 1)
      }

      setFlowingEdge(null)
      setActiveNodeId(step.nodeId)

      processTimerRef.current = setTimeout(() => {
        if (!processingRef.current) return

        setActiveNodeId(null)
        commitSteps([step], false)

        processTimerRef.current = setTimeout(() => {
          if (!processingRef.current) return
          if (stepQueueRef.current.length === 0) {
            processingRef.current = false
            setFlowingEdge(null)
            return
          }
          processAnimatedStep()
        }, PAUSE_MS)
      }, NODE_MS)
    }, edgeDelay)
  }, [commitSteps, popNextRenderableStep])

  const addVisitedNode = useCallback((step) => {
    stepQueueRef.current.push(step)
    if (!processingRef.current) {
      processingRef.current = true
      if (animationEnabled) {
        processAnimatedStep()
      } else if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          processFastQueue()
        })
      }
    }
  }, [animationEnabled, processAnimatedStep, processFastQueue])

  const isNodeVisited = useCallback((nodeId) => {
    return visitedSetRef.current.has(nodeId)
  }, [])

  const isNodeMatched = useCallback((nodeId) => {
    return matchedSetRef.current.has(nodeId)
  }, [])

  const isEdgeGlowed = useCallback((fromId, toId) => {
    return glowedSetRef.current.has(`${fromId}-${toId}`)
  }, [])

  useEffect(() => {
    return () => {
      clearRuntimeTimers()
    }
  }, [clearRuntimeTimers])

  useEffect(() => {
    if (!processingRef.current || stepQueueRef.current.length === 0) return

    clearRuntimeTimers()
    setActiveNodeId(null)
    setFlowingEdge(null)

    if (animationEnabled) {
      processAnimatedStep()
    } else if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        processFastQueue()
      })
    }
  }, [animationEnabled, clearRuntimeTimers, processAnimatedStep, processFastQueue])

  function toggleSelectedNode(nodeId) {
    setSelectedNodes(prev => {
      if (prev.includes(nodeId)) return prev.filter(x => x !== nodeId)
      if (prev.length >= 2) return [prev[1], nodeId]
      return [...prev, nodeId]
    })
    setLcaResult(null)
  }

  const lcaNodeId = lcaResult?.lcaNode?.id ?? null

  return (
    <AppContext.Provider value={{
      treeData, setTreeData,
      nodeCount, setNodeCount,
      maxDepth, setMaxDepth,
      animationEnabled, setAnimationEnabled,
      visitedCount,
      matchedCount,
      traversalLog,
      traversalResult, setTraversalResult,
      isTraversing, setIsTraversing,
      selectedNodes,
      lcaResult, setLcaResult,
      lcaNodeId,
      error, setError,
      resetTraversal,
      addVisitedNode,
      toggleSelectedNode,
      activeNodeId,
      flowingEdge,
      renderTick,
      isNodeVisited,
      isNodeMatched,
      isEdgeGlowed,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
