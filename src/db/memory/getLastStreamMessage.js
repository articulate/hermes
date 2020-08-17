const { last } = require('tinyfunk')

const debug = require('../../lib/debug').extend('db')

// getLastStreamMessage :: String -> Promise Message
const getLastStreamMessage = store => async streamName => {
  debug('getting last message: %o', { streamName })

  const message = last(store.streams.get(streamName) || [])

  if (message) debug('last message found: %o', message)
  else debug('stream empty: %o', { streamName })

  return message
}

module.exports = getLastStreamMessage
