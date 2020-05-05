const _ = require('highland')
const { tap } = require('tinyfunk')

const debug = require('../lib/debug').extend('db')
const parseMessage = require('../lib/parseMessage')

const sql = 'SELECT * FROM message_store.get_stream_messages($1, $2, $3, $4)'

// getStreamMessages :: Object -> Stream Message
const getStreamMessages = ({ query }) => opts => {
  debug('getting stream messages: %o', opts)

  let {
    batchSize,
    condition,
    position,
    streamName
  } = opts

  const paginate = (push, next) => {
    const vals = [
      streamName,
      position,
      batchSize,
      condition
    ]

    const send = rows => {
      push(null, rows)
      if (rows.length) next()
      else push(null, _.nil)
    }

    query(sql, vals).then(send, push)
  }

  const updatePosition = tap(msg => {
    position = msg.position + 1
  })

  return _(paginate)
    .flatten()
    .map(parseMessage)
    .map(updatePosition)
}

module.exports = getStreamMessages
