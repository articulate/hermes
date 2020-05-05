const _ = require('highland')
const { tap } = require('tinyfunk')

const debug = require('../lib/debug').extend('db')
const parseMessage = require('../lib/parseMessage')

const sql = 'SELECT * FROM message_store.get_category_messages($1, $2, $3, $4, $5, $6, $7)'

// getCategoryMessages :: Object -> Stream Message
const getCategoryMessages = ({ query }) => opts => {
  debug('getting category messages: %o', opts)

  let {
    batchSize,
    category,
    condition,
    correlation,
    groupMember,
    groupSize,
    position
  } = opts

  const paginate = (push, next) => {
    const vals = [
      category,
      position,
      batchSize,
      correlation,
      groupMember,
      groupSize,
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
    position = msg.globalPosition + 1
  })

  return _(paginate)
    .flatten()
    .map(parseMessage)
    .map(updatePosition)
}

module.exports = getCategoryMessages
