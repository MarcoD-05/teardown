import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // --- State: each piece of data the UI needs to track ---
  const [modes, setModes] = useState([])           // the list of modes for the dropdown
  const [selectedMode, setSelectedMode] = useState('design-review') // which mode is chosen
  const [document, setDocument] = useState('')       // the design doc text the user types
  const [result, setResult] = useState(null)         // the review result from the backend
  const [loading, setLoading] = useState(false)      // true while the review is running
  const [error, setError] = useState(null)           // any error message to show

  // Load the modes once on mount (same as before).
  useEffect(() => {
    fetch('/modes')
      .then((res) => res.json())
      .then((data) => setModes(data.modes))
      .catch((err) => console.error('Failed to load modes:', err))
  }, [])

  // Runs when the user clicks "Run Review".
  async function handleReview() {
    if (!document.trim()) {
      setError('Please paste a design document first.')
      return
    }
    setLoading(true)   // show the spinner / disable the button
    setError(null)     // clear any old error
    setResult(null)    // clear any old result

    try {
      const res = await fetch('/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document, mode: selectedMode }),
      })
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false) // always stop loading, success or fail
    }
  }

  // Pick a colour for each severity badge.
  function severityColor(severity) {
    if (severity === 'BLOCKER') return '#dc2626'
    if (severity === 'MAJOR') return '#ea580c'
    if (severity === 'MINOR') return '#ca8a04'
    return '#6b7280'
  }

  return (
    <div className="container">
      <h1>Crucible</h1>
      <p className="subtitle">AI design-review panel</p>

      {/* Mode picker */}
      <label className="field-label">Review mode</label>
      <select
        value={selectedMode}
        onChange={(e) => setSelectedMode(e.target.value)}
      >
        {modes.map((mode) => (
          <option key={mode.id} value={mode.id}>
            {mode.name}
          </option>
        ))}
      </select>

      {/* Document input */}
      <label className="field-label">Design document</label>
      <textarea
        value={document}
        onChange={(e) => setDocument(e.target.value)}
        placeholder="Paste your design doc, RFC, or architecture description here..."
        rows={10}
      />

      <button onClick={handleReview} disabled={loading}>
        {loading ? 'Reviewing… (~20s)' : 'Run Review'}
      </button>

      {error && <p className="error">⚠️ {error}</p>}

      {/* Results */}
      {result && (
        <div className="results">
          <div
            className="verdict"
            style={{ borderColor: severityColor(
              result.verdict.verdict === 'BLOCKED' ? 'BLOCKER' :
              result.verdict.verdict === 'NEEDS WORK' ? 'MAJOR' : 'ok'
            ) }}
          >
            <h2>{result.verdict.verdict}</h2>
            <p>{result.verdict.summary}</p>
          </div>

          <h3>Findings</h3>
          {result.verdict.findings.map((f, i) => (
            <div key={i} className="finding">
              <span
                className="badge"
                style={{ backgroundColor: severityColor(f.severity) }}
              >
                {f.severity}
              </span>
              <span className="finding-text">{f.issue}</span>
              <span className="raised-by">
                raised by: {f.raisedBy.join(', ')}
              </span>
            </div>
          ))}

          {result.verdict.openQuestions?.length > 0 && (
            <>
              <h3>Open questions</h3>
              <ul>
                {result.verdict.openQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App