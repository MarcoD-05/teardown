import { useState, useEffect } from 'react'

export default function LivePanel({ reviewers, chairThinking, collapsed }) {
  // Which collapsed cards the user has clicked open to re-read the transcript.
  const [open, setOpen] = useState({})

  // Reset expansion state whenever the panel is cleared for a new run.
  useEffect(() => {
    if (reviewers.length === 0) setOpen({})
  }, [reviewers.length])

  if (reviewers.length === 0) return null

  // Expand/collapse only matters once the panel itself is collapsed.
  function toggle(id) {
    if (!collapsed) return
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className={`live-panel${collapsed ? ' collapsed' : ''}`}>
      <h3>Panel</h3>
      {reviewers.map((r) => {
        const isOpen = collapsed && open[r.id]
        const showReview = r.review && (!collapsed || isOpen)
        return (
          <div key={r.id} className={`live-reviewer${isOpen ? ' expanded' : ''}`}>
            <div
              className="live-reviewer-head"
              role={collapsed ? 'button' : undefined}
              tabIndex={collapsed ? 0 : undefined}
              aria-expanded={collapsed ? Boolean(open[r.id]) : undefined}
              onClick={() => toggle(r.id)}
              onKeyDown={(e) => {
                if (collapsed && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  toggle(r.id)
                }
              }}
            >
              <strong>{r.name}</strong>
              <span className={`live-status ${r.status}`}>
                {r.status === 'pending' && 'waiting'}
                {r.status === 'thinking' && 'thinking…'}
                {r.status === 'done' && 'done'}
                {collapsed && (
                  <span className={`expand-caret${open[r.id] ? ' open' : ''}`}>›</span>
                )}
              </span>
            </div>
            {showReview && <pre className="live-review">{r.review}</pre>}
          </div>
        )
      })}
      {!collapsed && chairThinking && (
        <p className="chair-status">Chair is synthesizing the verdict…</p>
      )}
    </div>
  )
}