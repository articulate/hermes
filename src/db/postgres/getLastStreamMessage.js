const { head } = require('tinyfunk')

const debug = require('../../lib/debug').extend('db')
const parseMessage = require('../../lib/parseMessage')

const sql = 'SELECT * FROM message_store.get_last_stream_message($1)'

// getLastStreamMessage :: String -> Promise Message
const getLastStreamMessage = ({ query }) => async streamName => {
  debug('getting last message: %o', { streamName })
  const vals = [ streamName ]

  const message = await query(sql, vals).then(head).then(parseMessage)

  if (message) debug('last message found: %o', message)
  else debug('stream empty: %o', { streamName })

  return message
}

module.exports = getLastStreamMessage
