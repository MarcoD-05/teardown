// src/reviews-repo.js
// All database reads/writes for reviews live here.
import { pool } from './db.js'

export async function saveReview(document, findings, verdict) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const reviewResult = await client.query(
      `INSERT INTO reviews (document, verdict, summary, raw_reviews, open_questions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        document,
        verdict.verdict,
        verdict.summary,
        JSON.stringify(findings),
        JSON.stringify(verdict.openQuestions || []),
      ]
    )
    const reviewId = reviewResult.rows[0].id

    for (const f of verdict.findings || []) {
      await client.query(
        `INSERT INTO findings (review_id, severity, issue, raised_by)
         VALUES ($1, $2, $3, $4)`,
        [reviewId, f.severity, f.issue, JSON.stringify(f.raisedBy || [])]
      )
    }

    await client.query('COMMIT')
    return reviewId
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getReview(id) {
  const reviewResult = await pool.query(
    `SELECT * FROM reviews WHERE id = $1`,
    [id]
  )
  const review = reviewResult.rows[0]
  if (!review) return null

  const findingsResult = await pool.query(
    `SELECT severity, issue, raised_by FROM findings
     WHERE review_id = $1
     ORDER BY id`,
    [id]
  )

  review.findings = findingsResult.rows
  return review
}
