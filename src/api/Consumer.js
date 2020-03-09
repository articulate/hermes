const _ = require('highland')
const { merge } = require('tinyfunk')
const { once } = require('ramda')
const { tapP } = require('@articulate/funky')

const Consumer = db => opts => {
  const {
    batchSize = 1000,
    category,
    handlers = {},
    groupMember,
    groupSize,
    init,
    name,
    positionUpdateInterval = 100,
    tickInterval = 100
  } = opts

  let count = 0
  let position = 0
  const suffix = groupMember ? `-${groupMember}:${groupSize}` : ''
  const streamName = `${category}+position-${name}${suffix}`
  let up = false

  const pollOpts = { batchSize, category, groupMember, groupSize }

  const debug =
    require('../lib/debug').extend(`consumer-${name}${suffix}`)

  const assignPosition = msg => {
    position = msg ? msg.data.position : 0
  }

  const cleanup = once(signal => {
    debug(`received ${signal}, stopping`)
    up = false
  })

  const handleMessage = msg =>
    typeof handlers[msg.type] === 'function'
      ? _(tapP(handlers[msg.type])(msg))
      : _.of(msg)

  const loadPosition = () =>
    db.getLastStreamMessage(streamName).then(assignPosition)

  const logMessage = msg =>
    debug('dispatching message: %o', msg)

  const poll = () => {
    const stream = db.getCategoryMessages(merge(pollOpts, { position }))

    stream.observe().each(logMessage)

    stream.flatMap(handleMessage)
      .flatMap(updatePosition)
      .stopOnError(stop)
      .done(tick)
  }

  const start = async () => {
    debug('starting on category: %o', category)
    debug('handling types: %o', Object.keys(handlers))

    if (typeof init === 'function') {
      await init()
      debug('initialized')
    }

    await loadPosition()
    debug('position loaded: %o', position)

    up = true
    poll()
  }

  const stop = err => {
    if (err) console.error(err)
    debug(`stopping${err ? ' on error' : ''}`)
    up = false
  }

  const tick = () => {
    if (up) setTimeout(poll, tickInterval)
  }

  const updatePosition = msg => {
    position = msg.globalPosition + 1
    count++

    if (count >= positionUpdateInterval) {
      count = 0
      debug('position updated: %o', position)
      return writePosition()
    } else {
      return _.of()
    }
  }

  const writePosition = () =>
    _(db.writeMessage({
      streamName,
      type: 'Recorded',
      data: { position }
    }))

  process.once('SIGHUP', cleanup)
  process.once('SIGINT', cleanup)
  process.once('SIGTERM', cleanup)

  return { handlers, start, stop }
}

module.exports = Consumer
