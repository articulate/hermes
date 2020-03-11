const { mapObj, thrush } = require('tinyfunk')

const api = require('./api')

const extras = {
  VersionConflictError: require('./lib/VersionConflictError')
}

// hermes :: Object -> Object
const hermes = opts => {
  const db = require('./db')(opts)
  return Object.assign({}, mapObj(thrush(db), api), db, extras)
}

module.exports = hermes
