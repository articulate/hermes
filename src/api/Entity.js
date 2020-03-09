const { copyProp } = require('@articulate/funky')
const { mergeDeepRight } = require('ramda')

const {
  compose, dissoc, identity, merge, prop, when
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
  mergeDeepRight({
    cache: {
      enabled: true,
      limit: 1000
    },
    snapshot: {
      enabled: true,
      interval: 100
    }
  })

const cleanSnapshot =
  dissoc('snapshotVersion')

const copySnapshotVersion =
  copyProp('version', 'snapshotVersion')

const parseSnapshot =
  when(Boolean, compose(copySnapshotVersion, prop('data')))

// Entity :: Object -> String -> Promise [ a, Number ]
const Entity = db => opts => {
  const {
    cache,
    category,
    handlers = {},
    init,
    name,
    snapshot
  } = applyDefaults(opts)

  if (!category)
    throw new Error('Each entity must specify a category')

  if (!name)
    throw new Error('Each entity must have a unique name')

  const debug =
    require('../lib/debug').extend(`entity-${name}`)

  debug('cache enabled: %o', cache.enabled)
  debug('snapshot enabled: %o', snapshot.enabled)

  const _cache = cache.enabled && new LRUCache(cache.limit)

  const fetch = async id => {
    debug('fetching: %o', id)
    let record

    if (_cache) {
      record = _cache.get(id)
      if (record) debug('cache hit: %o', record)
      else debug('cache miss: %o', id)
    }

    if (snapshot.enabled && !record) {
      record = await getSnapshot(id)
      if (record) debug('snapshot loaded: %o', record)
      else debug('snapshot not found: %o', id)
    }

    if (!record)
      record = merge(emptyRecord, { entity: init, id })

    record = await db.getStreamMessages({
      streamName: `${category}-${id}`,
      position: record.version
    }).reduce(record, handle)
      .toPromise(Promise)

    debug('fetched: %o', cleanSnapshot(record))

    if (
      snapshot.enabled &&
      (record.version - record.snapshotVersion) >= snapshot.interval
    ) {
      record = copySnapshotVersion(record)
      await putSnapshot(id, record)
      debug('snapshot recorded: %o', { id, version: record.version })
    }

    if (_cache) {
      _cache.set(id, record)
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

  const putSnapshot = (id, record) =>
    db.writeMessage({
      streamName: `${name}:snapshot-${id}`,
      type: 'Recorded',
      data: cleanSnapshot(record)
    })

  return { fetch }
}

module.exports = Entity
