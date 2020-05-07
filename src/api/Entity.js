const {
  assoc, compose, dissoc, identity, merge, prop, when
} = require('tinyfunk')

// See https://github.com/dominictarr/bench-lru for benchmark comparison
// of available LRU cache implementations.  Mnemonist implements a doubly
// linked list that far outperforms the rest.
const LRUCache = require('mnemonist/lru-cache')

const emptyRecord = {
  entity: null,
  id: null,
  snapshotVersion: -1,
  time: null,
  version: -1
}

const applyDefaults =
  merge({
    cacheEnabled: true,
    cacheLimit: 1000,
    snapshotEnabled: true,
    snapshotInterval: 100
  })

const cleanSnapshot =
  dissoc('snapshotVersion')

const copySnapshotVersion = record =>
  assoc('snapshotVersion', record.version, record)

const parseSnapshot =
  when(Boolean, compose(copySnapshotVersion, prop('data')))

// Entity :: Object -> { fetch: String -> Promise [ a, Number ] }
const Entity = db => opts => {
  const {
    cacheEnabled,
    cacheLimit,
    category,
    handlers = {},
    init,
    name,
    snapshotEnabled,
    snapshotInterval
  } = applyDefaults(opts)

  if (!category)
    throw new Error('Each entity must specify a category')

  if (!name)
    throw new Error('Each entity must have a unique name')

  const debug =
    require('../lib/debug').extend(`entity-${name}`)

  debug('cache enabled: %o', cacheEnabled)
  debug('snapshot enabled: %o', snapshotEnabled)

  const cache = cacheEnabled && new LRUCache(cacheLimit)

  const fetch = async id => {
    debug('fetching: %o', id)
    let record

    if (cache) {
      record = cache.get(id)
      if (record) debug('cache hit: %o', record)
      else debug('cache miss: %o', id)
    }

    if (snapshotEnabled && !record) {
      record = await getSnapshot(id)
      if (record) debug('snapshot loaded: %o', record)
      else debug('snapshot not found: %o', id)
    }

    if (!record)
      record = merge(emptyRecord, { entity: init, id })

    const params = {
      streamName: `${category}-${id}`,
      position: record.version + 1
    }

    const stream = db.getStreamMessages(params)

    stream.observe().each(logEvent)

    const rethrow = (err, push) => {
      push(err)
    }

    record = await stream.reduce(record, handle)
      .stopOnError(rethrow)
      .toPromise(Promise)

    debug('fetched: %o', cleanSnapshot(record))

    if (
      snapshotEnabled &&
      (record.version - record.snapshotVersion) >= snapshotInterval
    ) {
      record = copySnapshotVersion(record)
      await putSnapshot(id, record)
      debug('snapshot recorded: %o', { id, version: record.version })
    }

    if (cache) {
      cache.set(id, record)
      debug('cached: %o', { id, version: record.version })
    }

    return [ record.entity, record.version ]
  }

  const getSnapshot = id =>
    db.getLastStreamMessage(`${name}:snapshot-${id}`)
      .then(parseSnapshot)

  const handle = (record, event) => {
    const handler = handlers[event.type] || identity

    return merge(record, {
      entity: handler(record.entity, event),
      time: new Date().toJSON(),
      version: event.position
    })
  }

  const logEvent = event =>
    debug('projecting event: %o', event)

  const putSnapshot = (id, record) =>
    db.writeMessage({
      streamName: `${name}:snapshot-${id}`,
      type: 'Recorded',
      data: cleanSnapshot(record)
    })

  return { fetch }
}

module.exports = Entity
