const _ = require('highland')
const { identity, juxt, mapObj, merge } = require('tinyfunk')

const once = require('../lib/once')
const tapP = require('../lib/tapP')

const throws = err => {
  throw err
}

// Consumer :: Object -> { start, stop }
const Consumer = db => opts => {
  const {
    batchSize = 1000,
    category,
    groupMember,
    groupSize,
    init,
    name,
    onError = throws,
    positionUpdateInterval = 100,
    tickInterval = 100
  } = opts

  const handlers = mapObj(tapP, opts.handlers || {})
  const pollOpts = { batchSize, category, groupMember, groupSize }
  const suffix = groupMember ? `-${groupMember}:${groupSize}` : ''
  const streamName = `${category}+position-${name}${suffix}`

  let count
  let pending
  let position
  let up = false

  const debug =
    require('../lib/debug').extend(`consumer-${name}${suffix}`)

  const assignPosition = msg => {
    position = msg ? msg.data.position : 1
  }

  const cleanup = once(signal => {
    if (up) {
      debug(`received ${signal}, stopping`)
      up = false
    }
  })

  const handleMessage = msg =>
    typeof handlers[msg.type] === 'function'
      ? _(handlers[msg.type](msg))
      : _.of(msg)

  const loadPosition = () =>
    db.getLastStreamMessage(streamName).then(assignPosition)

  const logMessage = msg =>
    debug('dispatching message: %o', msg)

  const poll = () => {
    if (!up) return

    const stream = db.getCategoryMessages(merge(pollOpts, { position }))

    stream.observe().each(logMessage)

    const processing = stream.flatMap(handleMessage)
      .flatMap(updatePosition)
      .stopOnError(juxt([ stop, stream.close ]))

    pending = processing.observe()
      .reduce(undefined, identity)
      .toPromise(Promise)

    processing.done(tick)
  }

  const start = async () => {
    if (up) {
      debug('already started')
      return
    }

    debug('starting on category: %o', category)
    debug('handling types: %o', Object.keys(handlers))

    if (typeof init === 'function') {
      await init()
      debug('initialized')
    }

    await loadPosition()
    debug('position loaded: %o', position)

    count = 0
    up = true
    poll()
  }

  const stop = err => {
    if (up) {
      debug(`stopping${err ? ' on error' : ''}`)
      up = false
    }

    if (err) onError(err)

    return pending
      ? pending.then(stopped)
      : Promise.resolve()
  }

  const stopped = () => {
    debug('stopped')
  }

  const tick = () => {
    setTimeout(poll, tickInterval)
  }

  const updatePosition = msg => {
    position = msg.globalPosition + 1
    count++

    if (count >= positionUpdateInterval) {
      count = 0
      debug('updating position: %o', position)
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

  return { start, stop }
}

module.exports = Consumer
