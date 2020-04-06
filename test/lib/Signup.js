const uuid = require('uuid')

const Signup = () => {
  const traceId = uuid.v4()
  const userId = uuid.v4()

  return {
    streamName: `userSignup:command-${userId}`,
    type: 'Signup',
    data: { userId },
    metadata: { traceId, userId }
  }
}

module.exports = Signup
