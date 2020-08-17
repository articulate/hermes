const { mapObj, thrush } = require('tinyfunk')

const api = require('./api')

const extras = {
  follow: require('./lib/follow'),
  VersionConflictError: require('./lib/VersionConflictError')
}

// hermes :: Object -> Object
const hermes = ({ mock=false, ...opts }) => {
  const driver = mock ? 'memory' : 'postgres'
  const db = require(`./db/${driver}`)(opts)
  return Object.assign({}, mapObj(thrush(db), api), db, extras)
}

module.exports = hermes
