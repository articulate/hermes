const debug = require('debug')
const { last } = require('tinyfunk')

const name = 'messages' // TODO: get from package.json

module.exports =
  debug(last(name.split('/')))
