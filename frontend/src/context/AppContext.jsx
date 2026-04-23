import { createContext, useContext, useState, useRef, useCallback } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [treeData, setTreeData]               = useState(null)
  const [nodeCount, setNodeCount]             = useState(0)
  const [maxDepth, setMaxDepth]               = useState(0)
  const [visitedIds, setVisitedIds]           = useState([])
  const [matchedIds, setMatchedIds]           = useState([])
  const [traversalLog, setTraversalLog]       = useState([])
  const [traversalResult, setTraversalResult] = useState(null)
  const [isTraversing, setIsTraversing]       = useState(false)
  const [selectedNodes, setSelectedNodes]     = useState([])
  const [lcaResult, setLcaResult]             = useState(null)
  const [error, setError]                     = useState(null)
  const [activeNodeId, setActiveNodeId]       = useState(null)
  const [flowingEdge, setFlowingEdge]         = useState(null)
  const [glowedEdges, setGlowedEdges]         = useState(new Set())

  const stepQueueRef  = useRef([])
  const processingRef = useRef(false)
  const visitedRef    = useRef([])
  const matchedRef    = useRef([])
  const prevNodeIdRef = useRef(null)

  const EDGE_MS  = 500
  const NODE_MS  = 300
  const PAUSE_MS = 40

  function resetTraversal() {
    setVisitedIds([])
    setMatchedIds([])
    setTraversalLog([])
    setTraversalResult(null)
    setSelectedNodes([])
    setLcaResult(null)
    setError(null)
    setActiveNodeId(null)
    setFlowingEdge(null)
    setGlowedEdges(new Set())
    visitedRef.current    = []
    matchedRef.current    = []
    stepQueueRef.current  = []
    processingRef.current = false
    prevNodeIdRef.current = null
  }

  const processNextStep = useCallback(() => {
    if (stepQueueRef.current.length === 0) {
      processingRef.current = false
      setActiveNodeId(null)
      setFlowingEdge(null)
      return
    }

    const step = stepQueueRef.current.shift()

    if (step.tag === '#text') {
      prevNodeIdRef.current = step.nodeId
      setTimeout(processNextStep, 0)
      return
    }

    const path = step.pathFromRoot || []
    const parentId = path.length >= 2 ? path[path.length - 2] : null

    if (parentId !== null) {
      setFlowingEdge({ from: parentId, to: step.nodeId })
    }

    setTimeout(() => {
      if (parentId !== null) {
        setGlowedEdges(prev => {
          const next = new Set(prev)
          next.add(`${parentId}-${step.nodeId}`)
          return next
        })
      }
      setFlowingEdge(null)
      setActiveNodeId(step.nodeId)

      setTimeout(() => {
        setActiveNodeId(null)
        visitedRef.current = [...visitedRef.current, step.nodeId]
        setVisitedIds([...visitedRef.current])
        if (step.matched) {
          matchedRef.current = [...matchedRef.current, step.nodeId]
          setMatchedIds([...matchedRef.current])
        }
        setTraversalLog(p => [...p, step])
        prevNodeIdRef.current = step.nodeId
        setTimeout(processNextStep, PAUSE_MS)
      }, NODE_MS)
    }, parentId !== null ? EDGE_MS : 0)
  }, [])

  const addVisitedNode = useCallback((step) => {
    stepQueueRef.current.push(step)
    if (!processingRef.current) {
      processingRef.current = true
      setTimeout(processNextStep, 0)
    }
  }, [processNextStep])

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
      visitedIds,
      matchedIds,
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
      glowedEdges,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}