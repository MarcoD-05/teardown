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
import { modes } from './modes.js'
import { runDebate } from './debate.js'
import rateLimit from 'express-rate-limit'
import { fetchPrAsDocument } from './github.js'

import path from 'path'
import { fileURLToPath } from 'url'
// Create the Express application — this `app` object is our whole server.
const app = express()
// Rate limiter fix
app.set('trust proxy', 1)
// Read config from the environment, with fallbacks if a var is missing.
const PORT = process.env.PORT || 3000
const NODE_ENV = process.env.NODE_ENV || 'development'
// Middleware: code that runs on every request, before your routes
if (NODE_ENV === 'production') {
  app.use(helmet()) // harden security headers, but only in production
}
app.use(cors()) // allow cross-origin requests
app.use(express.json()) // parse JSON request bodies into JS objects

// Limit the expensive LLM endpoints: max 10 requests per IP per 15 minutes.
const llmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many reviews from this IP. Try again later.' },
})
app.use(['/review', '/debate'], llmLimiter)

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



// Fetch a saved review by id.
app.post('/review', async (req, res) => {
  const { document, mode } = req.body
  if (!document) {
    return res.status(400).json({ error: 'Send a "document" field in the JSON body.' })
  }
  try {
    const result = await runReview(document, mode) // mode may be undefined → default kicks in
    const id = await saveReview(document, result.findings, result.verdict)
    res.json({ id, ...result })
  } catch (err) {
    console.error('Review failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Review a real GitHub PR by URL.
app.post('/review-pr', async (req, res) => {
  const { prUrl, mode } = req.body
  if (!prUrl) {
    return res.status(400).json({ error: 'Send a "prUrl" field (a GitHub PR link).' })
  }
  try {
    const { title, document } = await fetchPrAsDocument(prUrl)
    const result = await runReview(document, mode)
    const id = await saveReview(document, result.findings, result.verdict)
    res.json({ id, prTitle: title, ...result })
  } catch (err) {
    console.error('PR review failed:', err.message)
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

app.get('/modes', (req, res) => {
  const list = Object.entries(modes).map(([id, m]) => ({
    id,
    name: m.name,
    description: m.description,
  }))
  res.json({ modes: list })
})

// Architecture-decision debate: Advocate vs Skeptic, then Chair calls it.
app.post('/debate', async (req,res) => {
  const { decision, rounds } = req.body
  if (!decision) {
    return res.status(400).json({ error: 'Send a "decision" field in the JSON body.' })
  }
  try {
    const result = await runDebate(decision, rounds || 3)
    res.json(result)
  } catch (err) {
    console.error('Debate failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// --- Serve the built React frontend in production ---
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDist = path.join(__dirname, '..', 'client', 'dist')

// Serve the static built files (JS/CSS/index.html).
app.use(express.static(clientDist))

// For any non-API route, send index.html so React Router/the SPA handles it.
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

// Start listening for incoming requests on PORT
app.listen(PORT, () => {
  console.log(`Crucible API running on http://localhost:${PORT} (${NODE_ENV})`)
})