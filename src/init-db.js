// src/init-db.js
// Run once to create the tables. `npm run db:init`
import 'dotenv/config'
import { readFileSync } from 'fs'
import { pool } from './db.js'

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')

try {
    await pool.query(schema)
    console.log('✅ Database schema created.')
} catch (err) {
      console.error('Schema init failed:', err.message)
} finally {
    await pool.end()
}
