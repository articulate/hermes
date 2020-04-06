const { constant } = require('tinyfunk')

const tapP = f => x =>
  Promise.resolve(x).then(f).then(constant(x))

module.exports = tapP
