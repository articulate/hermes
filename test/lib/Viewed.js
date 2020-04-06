const uuid = require('uuid')

const Viewed = videoId => {
  const traceId = uuid.v4()
  const userId = uuid.v4()
  videoId = videoId || uuid.v4()

  return {
    streamName: `viewing-${videoId}`,
    type: 'Viewed',
    data: { userId, videoId, viewedAt: new Date().toJSON() },
    metadata: { traceId, userId }
  }
}

module.exports = Viewed
