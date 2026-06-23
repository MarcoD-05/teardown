// src/server.js
// Load .env values into process.env. MUST run before anything reads config.
import 'dotenv/config'
import { askLLM } from './llm.js'

import { saveReview, getReview } from './reviews-repo.js'

import { runReview } from './review.js'

// Prove persona works.
import { reviewers } from './reviewers.js'
// Pull in the libraries we installed.
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
// Create the Express application — this `app` object is our whole server.
const app = express()
// Read config from the environment, with fallbacks if a var is missing.
const PORT = process.env.PORT || 3000
const NODE_ENV = process.env.NODE_ENV || 'development'
// Middleware: code that runs on every request, before your routes
if (NODE_ENV === 'production') {
  app.use(helmet()) // harden security headers, but only in production
}
app.use(cors()) // allow cross-origin requests
app.use(express.json()) // parse JSON request bodies into JS objects

// Routes: "when a request hits this URL, run this function"
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: NODE_ENV })
})


// Temporary: run ONE reviewer against a sample doc to prove personas work.
app.get('/test-reviewer', async (req, res) => {
  const SAMPLE_DOC = `
System design: URL shortener.
- Single Postgres instance stores (short_code, long_url).
- Node/Express API. One endpoint POST /shorten, one GET /:code that 302-redirects.
- Short codes are a random 6-char base62 string.
- API keys checked against a hardcoded list in the source code.
- Deployed as a single container on Render. No caching.
`

  // Pick which reviewer to run via ?id=  (defaults to the engineer).
  const id = req.query.id || 'engineer'
  const reviewer = reviewers.find((r) => r.id === id)

  if (!reviewer) {
    return res.status(404).json({ error: `No reviewer with id "${id}"` })
  }

  try {
    const review = await askLLM({
      system: reviewer.systemPrompt,
      messages: [{ role: 'user', content: `Review this design document:\n${SAMPLE_DOC}` }],
    })
    res.json({ reviewer: reviewer.name, review })
  } catch (err) {
    console.error('Reviewer call failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Run the full pannel over a submitted design doc.
app.post('/review', async (req, res) => {
  const document = req.body.document
  if (!document) {
    return res.status(400).json({ error: 'Send a "document" field in the JSON body.' })
  }

  try {
    const result = await runReview(document)
    // persist it, then hand back the id alongside the result.
    const id = await saveReview(document, result.findings, result.verdict)

    res.json({ id, ...result })
  } catch (err) {
    console.error('Review failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Fetch a saved review by id.
app.post('/review', async (req, res) => {
  const document = req.body.document
  if (!document) {
    return res.status(400).json({ error: 'Send a "document" field in the JSON body.' })
  }
  try {
    const result = await runReview(document)
    // Persist it, then hand back the id alongside the result.
    const id = await saveReview(document, result.findings, result.verdict)
    res.json({ id, ...result })
  } catch (err) {
    console.error('Review failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Fetch a saved review by id.
app.get('/reviews/:id', async (req, res) => {
  try {
    const review = await getReview(req.params.id)
    if (!review) {
      return res.status(404).json({ error: 'Review not found' })

    }
    res.json(review)
  } catch (err) {
    console.error('Load failed:', err.essage)
    res.status(500).json({ error: err.message })
  }
})

// Start listening for incoming requests on PORT
app.listen(PORT, () => {
  console.log(`Crucible API running on http://localhost:${PORT} (${NODE_ENV})`)
})