const { evolve, pipe, when } = require('tinyfunk')
const { renameAll } = require('@articulate/funky')

const parseMessage =
  when(Boolean, pipe(
    renameAll({
      global_position: 'globalPosition',
      stream_name: 'streamName'
    }),
    evolve({
      data: JSON.parse,
      globalPosition: Number,
      metadata: JSON.parse,
      position: Number
    })
  ))

module.exports = parseMessage
