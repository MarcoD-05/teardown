import { useState, useEffect } from 'react'
import './App.css'
import Segmented from './components/Segmented'
import LivePanel from './components/LivePanel'
import Verdict from './components/Verdict'

function App() {
  const [modes, setModes] = useState([])
  const [selectedMode, setSelectedMode] = useState('design-review')
  const [document, setDocument] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [inputMode, setInputMode] = useState('doc')
  const [prUrl, setPrUrl] = useState('')
  const [strictnessLevels, setStrictnessLevels] = useState([])
  const [selectedStrictness, setSelectedStrictness] = useState('standard')
  const [streamMode, setStreamMode] = useState(false)
  const [liveReviewers, setLiveReviewers] = useState([])
  const [chairThinking, setChairThinking] = useState(false)

  useEffect(() => {
    fetch('/modes')
      .then((r) => r.json())
      .then((d) => setModes(d.modes))
      .catch((err) => console.error('modes fetch failed:', err))
  }, [])

  useEffect(() => {
    fetch('/strictness')
      .then((r) => r.json())
      .then((d) => setStrictnessLevels(d.strictness))
      .catch((err) => console.error('strictness fetch failed:', err))
  }, [])

  async function handleReview() {
    if (!document.trim()) {
      setError('Please paste a design document first.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setLiveReviewers([])
    try {
      const res = await fetch('/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document, mode: selectedMode, strictness: selectedStrictness }),
      })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePrReview() {
    if (!prUrl.trim()) {
      setError('Paste a GitHub PR URL first.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setLiveReviewers([])
    try {
      const res = await fetch('/review-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prUrl, mode: selectedMode, strictness: selectedStrictness }),
      })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleStreamEvent(event) {
    if (event.type === 'start') {
      setLiveReviewers(event.reviewers.map((r) => ({ ...r, status: 'pending', review: '' })))
    } else if (event.type === 'reviewer-start') {
      setLiveReviewers((prev) =>
        prev.map((r) => (r.id === event.id ? { ...r, status: 'thinking' } : r))
      )
    } else if (event.type === 'reviewer-done') {
      setLiveReviewers((prev) =>
        prev.map((r) => (r.id === event.id ? { ...r, status: 'done', review: event.review } : r))
      )
    } else if (event.type === 'chair-start') {
      setChairThinking(true)
    } else if (event.type === 'verdict') {
      setChairThinking(false)
      setResult({ verdict: event.verdict })
    } else if (event.type === 'error') {
      setError(event.message)
    }
  }

  async function handleStreamReview() {
    if (inputMode === 'doc' && !document.trim()) {
      setError('Please paste a design document first.')
      return
    }
    if (inputMode === 'pr' && !prUrl.trim()) {
      setError('Paste a GitHub PR URL first.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setLiveReviewers([])
    setChairThinking(false)

    try {
      const res = await fetch('/review-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          inputMode === 'pr'
            ? { prUrl, mode: selectedMode, strictness: selectedStrictness }
            : { document, mode: selectedMode, strictness: selectedStrictness }
        ),
      })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n\n')
        buffer = parts.pop()

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data:')) continue
          const event = JSON.parse(line.slice(5).trim())
          handleStreamEvent(event)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Dispatch to the right handler for the current input + review type.
  function runReview() {
    if (streamMode) return handleStreamReview()
    return inputMode === 'pr' ? handlePrReview() : handleReview()
  }

  const buttonLabel = loading
    ? (inputMode === 'pr' ? 'Reviewing PR… (~20s)' : 'Reviewing… (~20s)')
    : streamMode
      ? (inputMode === 'pr' ? 'Run Live PR Review' : 'Run Live Review')
      : (inputMode === 'pr' ? 'Review PR' : 'Run Review')

  return (
    <div className="container">
      <h1>Verdict<span className="accent">Lab</span></h1>
      <p className="subtitle">AI design-review panel</p>

      <Segmented
        options={[
          { value: 'doc', label: 'Paste a doc' },
          { value: 'pr', label: 'Review a GitHub PR' },
        ]}
        value={inputMode}
        onChange={setInputMode}
      />

      <label className="field-label">Review mode</label>
      <select value={selectedMode} onChange={(e) => setSelectedMode(e.target.value)}>
        {modes.map((mode) => (
          <option key={mode.id} value={mode.id}>{mode.name}</option>
        ))}
      </select>

      <label className="field-label">Strictness</label>
      <select value={selectedStrictness} onChange={(e) => setSelectedStrictness(e.target.value)}>
        {strictnessLevels.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <label className="field-label">Review type</label>
      <Segmented
        options={[
          { value: false, label: 'Standard' },
          { value: true, label: 'Live updates' },
        ]}
        value={streamMode}
        onChange={setStreamMode}
      />

      {inputMode === 'doc' ? (
        <>
          <label className="field-label">Design document</label>
          <textarea
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            placeholder="Paste your design doc, RFC, or architecture description here..."
            rows={10}
          />
        </>
      ) : (
        <>
          <label className="field-label">GitHub PR URL</label>
          <input
            type="text"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
          />
        </>
      )}

      <button onClick={runReview} disabled={loading}>{buttonLabel}</button>

      {error && <p className="error">⚠️ {error}</p>}

      <LivePanel
        reviewers={liveReviewers}
        chairThinking={chairThinking}
        collapsed={Boolean(result)}
      />

      {result && <Verdict verdict={result.verdict} />}
    </div>
  )
}

export default App