const { mapObj, thrush } = require('tinyfunk')

const api = require('./api')

const extras = {
  VersionConflictError: require('./lib/VersionConflictError')
}

// messages :: Object -> Object
const messages = opts => {
  const db = require('./db')(opts)
  return Object.assign({}, mapObj(thrush(db), api), db, extras)
}

module.exports = messages
