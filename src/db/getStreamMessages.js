const debug = require('../lib/debug').extend('db')
const parseMessage = require('../lib/parseMessage')

const sql = 'SELECT * FROM message_store.get_stream_messages($1, $2, $3, $4)'

// getStreamMessages :: Object -> Stream Message
const getStreamMessages = ({ queryS }) => opts => {
  debug('getting stream messages: %o', opts)

  const vals = [
    opts.streamName,
    opts.position,
    opts.batchSize,
    opts.condition,
  ]

  const stream = queryS(sql, vals)
  const result = stream.map(parseMessage)
  result.close = stream.close
  return result
}

module.exports = getStreamMessages
