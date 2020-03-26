const debug = require('../lib/debug').extend('db')
const parseMessage = require('../lib/parseMessage')

const sql = 'SELECT * FROM message_store.get_category_messages($1, $2, $3, $4, $5, $6, $7)'

// getCategoryMessages :: Object -> Stream Message
const getCategoryMessages = ({ queryS }) => opts => {
  debug('getting category messages: %o', opts)

  const vals = [
    opts.category,
    opts.position,
    opts.batchSize,
    opts.correlation,
    opts.groupMember,
    opts.groupSize,
    opts.condition,
  ]

  return queryS(sql, vals).map(parseMessage)
}

module.exports = getCategoryMessages
