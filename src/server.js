// src/server.js
// Load .env values into process.env. MUST run before anything reads config.
import 'dotenv/config'
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

// Start listening for incoming requests on PORT
app.listen(PORT, () => {
  console.log(`Crucible API running on http://localhost:${PORT} (${NODE_ENV})`)
})