// Verdict card + finding + open questions, tone-class logic moved in here
export default function Verdict({ verdict }) {
  const tone =
    verdict.verdict === 'BLOCKED' ? 'blocked' :
    verdict.verdict === 'NEEDS WORK' ? 'needs-work' : 'ship'

  return (
    <div className="results">
      <div className={`verdict ${tone}`}>
        <h2>{verdict.verdict}</h2>
        <p>{verdict.summary}</p>
      </div>

      <h3>Findings</h3>
      {verdict.findings.map((f, i) => (
        <div key={i} className="finding">
          <span className={`badge ${f.severity.toLowerCase()}`}>{f.severity}</span>
          <span className="finding-text">{f.issue}</span>
          <span className="raised-by">raised by: {f.raisedBy.join(', ')}</span>
        </div>
      ))}

      {verdict.openQuestions?.length > 0 && (
        <>
          <h3>Open questions</h3>
          <ul>
            {verdict.openQuestions.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </>
      )}
    </div>
  )
}