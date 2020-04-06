const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.TEST_DB_URI
})

const cleanup = () =>
  pool.end().catch(console.error)

const query = async (sql, vals=[]) => {
  const client = await pool.connect()

  try {
    var res = await client.query(sql, vals)
  } finally {
    client.release()
  }

  return res.rows
}

module.exports = { cleanup, query }
