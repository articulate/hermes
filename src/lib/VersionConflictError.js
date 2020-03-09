function VersionConflictError({ actualVersion, expectedVersion, streamName }) {
  Error.captureStackTrace(this, this.constructor)
  this.message = `VersionConflict: stream ${streamName} expected version ${expectedVersion} but was at version ${actualVersion}`
  this.name = 'VersionConflictError'
}

VersionConflictError.prototype = Object.create(Error.prototype)
VersionConflictError.prototype.constructor = VersionConflictError

module.exports = VersionConflictError
