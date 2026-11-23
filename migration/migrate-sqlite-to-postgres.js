/**
 * One-time, repeatable data migration from Buddy Board's SQLite database to PostgreSQL.
 * Run from the project root after setting DATABASE_URL.
 * Keep buddyboard.sqlite, -wal and -shm together; do not delete them before verification.
 */
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Pool } = pg
const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = process.cwd()
const sqlitePath = process.env.SQLITE_FILE || path.join(projectRoot, 'server', 'data', 'buddyboard.sqlite')
const schemaPath = path.join(here, 'schema.sql')
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('Missing DATABASE_URL. Set it to your Neon PostgreSQL connection string.')
  process.exit(1)
}
if (!existsSync(sqlitePath)) {
  console.error(`SQLite database not found: ${sqlitePath}`)
  console.error('Set SQLITE_FILE to the path of buddyboard.sqlite. Keep its -wal and -shm files beside it.')
  process.exit(1)
}

const sqlite = new DatabaseSync(sqlitePath, { readOnly: true })
const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })
const tables = ['users', 'sessions', 'requests', 'help_events', 'feedback']
const columns = {
  users: ['id','full_name','email','student_id','branch','study_year','salt','password_hash','rank_points','created_at'],
  sessions: ['token_hash','user_id','expires_at'],
  requests: ['id','author_id','person','tag','icon','title','detail','swap_details','place','need','status','created_at','legacy_helped','color'],
  help_events: ['id','request_id','helper_id','status','swap_offer','created_at','completed_at','base_points'],
  feedback: ['id','help_id','author_id','helper_id','rating','comment','points_awarded','created_at'],
}

function getRows(table) {
  return sqlite.prepare(`SELECT * FROM ${table}`).all()
}

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(readFileSync(schemaPath, 'utf8'))

    const counts = {}
    // Parent rows first so foreign-key constraints are satisfied.
    for (const table of tables) {
      const rows = getRows(table)
      counts[table] = rows.length
      if (!rows.length) continue
      const cols = columns[table]
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(',')
      const updateCols = cols.filter(c => c !== (table === 'sessions' ? 'token_hash' : table === 'feedback' ? 'id' : 'id'))
      const conflictKey = table === 'sessions' ? 'token_hash' : table === 'feedback' ? 'id' : 'id'
      const updateSql = updateCols.length
        ? `DO UPDATE SET ${updateCols.map(c => `${c}=EXCLUDED.${c}`).join(',')}`
        : 'DO NOTHING'
      const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders}) ON CONFLICT (${conflictKey}) ${updateSql}`
      for (const row of rows) {
        await client.query(sql, cols.map(c => row[c] ?? null))
      }
    }
    await client.query('COMMIT')
    console.log('Migration completed successfully. Rows copied:')
    for (const [table, count] of Object.entries(counts)) console.log(`  ${table}: ${count}`)
    console.log('\nNow verify these counts in Neon before switching the live backend.')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
    sqlite.close()
  }
}

main().catch(error => {
  console.error('Migration failed:', error.message)
  process.exitCode = 1
})
