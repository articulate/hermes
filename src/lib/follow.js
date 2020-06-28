const { curry, merge, path } = require('tinyfunk')

const follow = (prev, next) => {
  const metadata = Object.assign({}, next.metadata)

  metadata.causationMessageGlobalPosition = prev.globalPosition
  metadata.causationMessagePosition = prev.position
  metadata.causationMessageStreamName = prev.streamName
  metadata.correlationStreamName = path(['metadata', 'correlationStreamName'], prev)
  metadata.replyStreamName = path(['metadata', 'replyStreamName'], prev)

  return merge(next, { metadata })
}

module.exports = curry(follow)
