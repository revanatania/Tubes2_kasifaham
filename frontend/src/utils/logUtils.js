export function formatStep(step) {
  const num = String(step.step + 1).padStart(2, '0')
  const cls = step.tag // tag saja sesuai permintaan
  return `[${num}] <${cls}>${step.matched ? ' ✓' : ''}`
}

export function formatStepRich(step) {
  return {
    num: String(step.step + 1).padStart(2, '0'),
    tag: step.tag,
    matched: step.matched,
    depth: step.depth,
    nodeId: step.nodeId,
  }
}