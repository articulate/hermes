const { mapObj, merge, pipe, thrush } = require('tinyfunk')
const { Pool } = require('pg')

const debug = require('../lib/debug').extend('db')
const once = require('../lib/once')

const db = {
  getCategoryMessages: require('./getCategoryMessages'),
  getLastStreamMessage: require('./getLastStreamMessage'),
  getStreamMessages: require('./getStreamMessages'),
  streamVersion: require('./streamVersion'),
  writeMessage: require('./writeMessage')
}

// See the following for available options:
// - https://node-postgres.com/api/client
// - https://node-postgres.com/api/pool
const dbFactory = opts => {
  const pool = new Pool(opts)
  debug('pool created, max connections: %o', pool.options.max)
  pool.on('error', console.error)

  const cleanup = once(signal => {
    debug(`${signal ? `received ${signal}, ` : ''}draining pool`)
    return pool.end().then(drained, console.error)
  })

  const drained = () =>
    debug('pool drained')

  // query :: (String, [a]) -> Promise b
  const query = async (sql, vals=[]) => {
    const client = await pool.connect()

    try {
      var res = await client.query(sql, vals)
    } finally {
      client.release()
    }

    return res.rows
  }

  process.once('SIGHUP', cleanup)
  process.once('SIGINT', cleanup)
  process.once('SIGTERM', cleanup)

  return pipe(
    mapObj(thrush({ query })),
    merge({ cleanup })
  )(db)
}

module.exports = dbFactory
