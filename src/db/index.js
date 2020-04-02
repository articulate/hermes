const _ = require('highland')
const Cursor = require('pg-cursor')
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

  // queryS :: (String, [a]) -> Stream b
  const queryS = (sql, vals=[]) => {
    let client, cursor

    const close = once(err1 => {
      debug(`closing cursor${err1 ? ' on error' : ''}`)
      cursor.close(err2 =>
        client.release(err1 || err2)
      )
    })

    const openCursor = klient => {
      debug('opening cursor')
      client = klient
      cursor = client.query(new Cursor(sql, vals))

      return _((push, next) => {
        cursor.read(100, (err, rows) => {
          push(err, rows)
          if (rows.length) next()
          else push(null, _.nil)
        })
      }).flatten()
    }

    const stream = _(pool.connect()).flatMap(openCursor)
    stream.observe().done(close)
    stream.close = close
    return stream
  }

  process.once('SIGHUP', cleanup)
  process.once('SIGINT', cleanup)
  process.once('SIGTERM', cleanup)

  return pipe(
    mapObj(thrush({ query, queryS })),
    merge({ cleanup })
  )(db)
}

module.exports = dbFactory
