const uuid = require('uuid')

const Signup = () => {
  const traceId = uuid.v4()
  const userId = uuid.v4()
  const streamName = `userSignup:command-${userId}`

  return {
    streamName,
    type: 'Signup',
    data: { userId },
    metadata: { traceId, userId }
  }
}

module.exports = Signup
