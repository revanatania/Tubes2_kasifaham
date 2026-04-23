const BASE = '/api'

export async function parseHTML(body) {
  const res = await fetch(`${BASE}/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

export function traverseSSE(body, onEvent) {
  let aborted = false
  let reader = null

  ;(async () => {
    try {
      const res = await fetch(`${BASE}/traverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text()
        onEvent('error', text || `HTTP ${res.status}`)
        return
      }
      reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        if (aborted) break
        const { done, value } = await reader.read()
        if (done) { onEvent('done', null); break }
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw || raw === '{}') continue
          try {
            const parsed = JSON.parse(raw)
            if (parsed.type === 'done') onEvent('done', null)
            else onEvent(parsed.type, parsed.payload)
          } catch { }
        }
      }
    } catch (err) {
      if (!aborted) onEvent('error', err.message)
    }
  })()

  return function abort() {
    aborted = true
    reader?.cancel()
  }
}

export async function queryLCA(body) {
  const res = await fetch(`${BASE}/lca`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}