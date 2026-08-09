import { DatabaseSync } from 'node:sqlite'

const databasePath = process.argv[2] || '/var/lib/labofpdf/feedback.sqlite3'
const database = new DatabaseSync(databasePath, { readOnly: true })

const summary = database.prepare(`
  SELECT tool, outcome, reason, COUNT(*) AS count
  FROM feedback
  WHERE created_at >= datetime('now', '-30 days')
  GROUP BY tool, outcome, reason
  ORDER BY tool, outcome, count DESC
`).all()

console.table(summary)
database.close()
