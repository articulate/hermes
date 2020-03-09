const versionConflictRegex = /^Wrong.*Stream Version: (\d+)\)/

const VersionConflictError = require('./VersionConflictError')

const handleVersionConflict = ({ expectedVersion, streamName }) => err => {
  const errorMatch = err.message.match(versionConflictRegex)
  if (errorMatch === null) return Promise.reject(err)

  const error = new VersionConflictError({
    actualVersion: Number(errorMatch[1]),
    expectedVersion,
    streamName
  })

  error.stack = err.stack
  return Promise.reject(error)
}

module.exports = handleVersionConflict
