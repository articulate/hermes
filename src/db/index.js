const _ = require('highland')
const { mapObj, thrush, when } = require('tinyfunk')
const { once } = require('ramda')
const { Pool } = require('pg')
const QueryStream = require('pg-query-stream')

const debug = require('../lib/debug').extend('db')

const db = {
  getCategoryMessages: require('./getCategoryMessages'),
  getLastStreamMessage: require('./getLastStreamMessage'),
  getStreamMessages: require('./getStreamMessages'),
  writeMessage: require('./writeMessage')
}

const setPath = client =>
  client.query('SET search_path = message_store, public')

// See the following for available options:
// - https://node-postgres.com/api/client
// - https://node-postgres.com/api/pool
const dbFactory = opts => {
  const pool = new Pool(opts)
  debug('pool created, max connections: %o', pool.options.max)
  pool.on('error', console.error)

  const cleanup = once(signal => {
    debug(`received ${signal}, draining pool`)
    pool.end(when(Boolean, console.error))
  })

  // query :: (String, [a]) -> Promise b
  const query = async (sql, vals=[]) => {
    const client = await pool.connect()
    await setPath(client)
    const res = await client.query(sql, vals)
    client.release()
    return res.rows
  }

  // queryS :: (String, [a]) -> Stream b
  const queryS = (sql, vals=[]) =>
    _((async () => {
      const client = await pool.connect()
      await setPath(client)
      const stream = _(client.query(new QueryStream(sql, vals)))
      stream.observe().done(() => client.release())
      return stream
    })()).flatten()

  process.once('SIGHUP', cleanup)
  process.once('SIGINT', cleanup)
  process.once('SIGTERM', cleanup)

  return mapObj(thrush({ query, queryS }), db)
}

module.exports = dbFactory
