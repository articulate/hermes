const _ = require('highland')

const debug = require('../../lib/debug').extend('db')

// getCategoryMessages :: Object -> Stream Message
const getCategoryMessages = store => opts => {
  debug('getting stream messages: %o', opts)

  const { position = 0, streamName } = opts

  const byPosition = msg =>
    msg.position >= position

  return _(store.streams.get(streamName) || []).filter(byPosition)
}

module.exports = getCategoryMessages
