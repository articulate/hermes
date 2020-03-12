class VersionConflictError extends Error {
  constructor(opts, ...args) {
    super(...args)
    const { actualVersion, expectedVersion, streamName } = opts

    Error.captureStackTrace(this, VersionConflictError)

    this.message = `VersionConflict: stream ${streamName} expected version ${expectedVersion} but was at version ${actualVersion}`
    this.name = 'VersionConflictError'
  }
}

module.exports = VersionConflictError
