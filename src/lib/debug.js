const debug = require('debug')
const { last } = require('tinyfunk')

const name = require('../../package.json').name

module.exports =
  debug(last(name.split('/')))
