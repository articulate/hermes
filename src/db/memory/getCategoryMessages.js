const _ = require('highland')

const debug = require('../../lib/debug').extend('db')

// getCategoryMessages :: Object -> Stream Message
const getCategoryMessages = store => opts => {
  debug('getting category messages: %o', opts)

  const { category, position = 1 } = opts

  const byPosition = msg =>
    msg.globalPosition >= position

  return _(store.streams.get(category) || []).filter(byPosition)
}

module.exports = getCategoryMessages
