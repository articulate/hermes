const debug = require('../../lib/debug').extend('db')

// streamVersion :: String -> Promise Number
const streamVersion = store => async streamName => {
  debug('loading stream version: %o', { streamName })
  const version = (store.streams.get(streamName) || []).length - 1
  debug('stream version loaded: %o', { streamName, version })
  return version
}

module.exports = streamVersion
