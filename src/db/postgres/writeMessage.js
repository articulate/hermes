const { assoc, compose } = require('tinyfunk')
const uuid = require('uuid')

const debug = require('../../lib/debug').extend('db')
const handleVersionConflict = require('../../lib/handleVersionConflict')

const writeSql = 'SELECT message_store.write_message($1, $2, $3, $4, $5, $6)'

// writeMessage :: Message -> Promise Message
const writeMessage = ({ query }) => {
  const write = async message => {
    if (!message.type)
      return Promise.reject(new Error('Messages must have a type'))

    const { data, expectedVersion, metadata, streamName, type } = message
    const id = uuid.v4()
    const result = { id, ...message }
    debug('writing message: %o', result)

    const vals = [
      id,
      streamName,
      type,
      data,
      metadata,
      expectedVersion
    ]

    await query(writeSql, vals)
      .catch(handleVersionConflict({ expectedVersion, streamName }))

    return result
  }

  write.initial =
    compose(write, assoc('expectedVersion', -1))

  return write
}

module.exports = writeMessage
