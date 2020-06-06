const { merge } = require('tinyfunk')
const uuid = require('uuid')

const debug = require('../../lib/debug').extend('db')
const VersionConflictError = require('../../lib/VersionConflictError')

// writeMessage :: Message -> Promise Message
const writeMessage = store => async message => {
  if (!message.type)
    return Promise.reject(new Error('Messages must have a type'))

  const { expectedVersion, streamName } = message
  const id = uuid.v4()
  const result = { id, ...message }
  debug('writing message: %o', result)

  const categoryName = streamName.split('-')[0]
  let category = store.streams.get(categoryName)
  let stream = store.streams.get(streamName)

  if (!category) {
    category = []
    store.streams.set(categoryName, category)
  }

  if (!stream) {
    stream = []
    store.streams.set(streamName, stream)
  }

  if (typeof expectedVersion === 'number') {
    const actualVersion = stream.length - 1

    if (expectedVersion !== actualVersion) {
      const err = new VersionConflictError({
        actualVersion,
        expectedVersion,
        streamName
      })

      return Promise.reject(err)
    }
  }

  const record = merge(result, {
    globalPosition: store.messages.length + 1,
    position: stream.length,
    time: new Date().toJSON()
  })

  category.push(record)
  stream.push(record)
  store.messages.push(record)
  store.lastMessage = record

  return result
}

module.exports = writeMessage
