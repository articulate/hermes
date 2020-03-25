const { compose, defaultTo, path } = require('tinyfunk')

const debug = require('../lib/debug').extend('db')

const sql = `SELECT * FROM message_store.stream_version($1)`

const parseVersion =
  compose(Number, defaultTo('-1'), path([0, 'stream_version']))

// streamVersion :: String -> Promise Number
const streamVersion = ({ query }) => async streamName => {
  debug('loading stream version: %o', { streamName })
  const version = await query(sql, [ streamName ]).then(parseVersion)
  debug('stream version loaded: %o', { streamName, version })
  return version
}

module.exports = streamVersion
