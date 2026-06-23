// src/db.js
// One shared connection pool for the whole app.
import pg from 'pg'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL

// Local Postgres doesn't use SSL; Render (remote) requires it.
const isLocal =
  connectionString?.includes('localhost') ||
  connectionString?.includes('127.0.0.1')

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
})
