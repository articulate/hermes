# API

Pretty much every system built with Hermes will need to:

- Write messages to the message store with [`writeMessage`](/api?id=writemessage).
- Implement message workflows with [`follow`](/api?id=follow).
- Consume messages and handle them with a [`Consumer`](/api?id=consumer).
- Project events into current state with an [`Entity`](/api?id=entity).

There are [some extras](/extras) that help in various situations, but these three are your daily drivers.

## Consumer

```haskell
Consumer :: Object -> { start, stop }
```

Initializes a consumer with an object of options, returning an interface with `start` and `stop` functions.  A consumer processes ordered messages from a single [category](/core-concepts?id=stream), keeping track of its position to resume processing after restarts.  Once finished reading a category, it continues to poll for new messages.

?> **Consumers put the "autonomy" in evented autonomous services,** because they operate as independent actors.  If one goes down, the rest will presumably stay up and running (unless you [host them together](/api?id=starting-stopping)).

Consumers can act either as components, which process messages and write new events, or aggregators, which process events to update read models.  From an implementation standpoint, the main difference that is aggregators will often use an `init` function to initialize the read model, while components will not.

### Options / Example

| Option                   | Type       | Default  | Description                                                                  |
|:-------------------------|:-----------|:---------|:-----------------------------------------------------------------------------|
| `batchSize`              | `Number`   | `1000`   | Number of messages to retrieve per batch                                     |
| `category`               | `String`   |          | Name of the category to read                                                 |
| `handlers`               | `Object`   | `{}`     | Map of message types to async handler functions                              |
| `groupMember`            | `Number`   |          | Optional zero-based group member number to enable concurrency                |
| `groupSize`              | `Number`   |          | Optional group total to enable concurrency                                   |
| `init`                   | `Function` |          | Optional read model initializer                                              |
| `name`                   | `String`   |          | Unique name used to store the consumer's position                            |
| `onError`                | `Function` | (throws) | Optional custom error handler, see [details here](/api?id=error-handling)    |
| `positionUpdateInterval` | `Number`   | `100`    | Minimum number of messages processed before the current position is recorded |
| `tickInterval`           | `Number`   | `100`    | Milliseconds to wait after latest batch before polling for new messages      |

```js
const { Consumer } = require('../lib/hermes')
const UserActivation = require('./entities/UserActivation')

const Activate = async message => {
  const { data: { userId }, globalPosition } = message

  const [ entity, version ] = await UserActivation.fetch(userId)
  const { activated, activatedVersion } = entity

  if (!activated && activatedVersion < globalPosition) {
    await writeMessage({
      streamName: `userActivation-${message.data.userId}`
      type: 'Activated',
      data: { userId },
      metadata: {
        traceId: message.metadata.traceId,
        userId: message.metadata.userId
      },
      expectedVersion: version
    })
  }
}

const Deactivate = async message => {
  // the reverse of Activate above
}

module.exports =
  Consumer({
    name: 'UserActivation',
    category: 'userActivation:command',
    handlers: {
      Activate,
      Deactivate
    }
  })
```

?> **Notice the idempotence check in the handler.**  We only want to act on a message if we haven't previously acted on it.  Messages in a stream are processed in order, but consumers restart all the time (whether by chaos or actual deploys), so messages are frequently reprocessed.  Therefore, your message handlers **must be idempotent.**  A collection of common idempotence patterns is [included here](/idempotence-patterns).

### Starting / Stopping

A consumer is constructed in a dormant state, and will not begin processing messages until you call its `start()` function.  If desired, multiple related consumers that together form one [component](/core-concepts?id=service) can be run together on a single host.  Starting them together is simple:

```js
const components = [
  require('./UserActivation'),
  require('./UserInvitation')
]

components.forEach(comp => comp.start())
```

!> **When one of its handlers rejects with an error, a consumer will automatically stop processing messages and then re-throw the error, which will likely kill the process.**  (See [Error Handling](/api?id=error-handling) for details.)  So if you've grouped multiple consumers onto a single host like this, a failure in one will stop the rest.  You'll want to balance the cost of isolated hosting with the risk of these types of failures.  However, if the consumers are related and together form one [component](/core-concepts?id=service), it may be completely appropriate to stop them all.

If you need to stop manually for any other reason, simply call its `stop()` function, which returns a `Promise` that resolves when all processing has stopped.

### Consumer Groups

Consumers can be scaled horizontally to process more messages in parallel.  You can enable this by supplying the `groupMember` and `groupTotal` options.  Once enabled, each member of the group will only receive messages from a portion of the streams in a category, divided amongst the members by consistently hashing the stream names.  That way all of the messages for a particular stream will be processed in order by a single consumer group member.

Parallel processing can help with throughput, but also helps with resilience, since one group member can stop when it hits an error without affecting the other group members.

The position of each group member is stored in a stream named:

```js
`${category}+position-${name}-${groupMember}:${groupSize}`
```

The careful observer will come to the conclusion that scaling up or down will change the stream name, making each group member completely forget its position.  The solution is to copy the current position to the new stream before scaling, with steps similar to these:

1.  Get the current position of each group member.
1.  Take the minimum current position, and subtract a little buffer (maybe 100).
1.  Pre-populate the new streams with the result, using the name format above.
1.  Roll-out the old group members for the new.
1.  Leave the old streams alone. <small>_(Repeat to yourself, "Streams of messages are append-only and immutable.")_</small>

We may include an implementation of this script in a future release, but until then it's left as an exercise for the reader.

### Error Handling

In most cases, errors that occur during the processing of a message by a handler should not be caught, since an error represents a fatal, unrecoverable condition.  We can't skip the message, because then all future state in the message store and any read models would be invalid.  Consequently, in the event of an error, a consumer will stop processing messages.

?> **After stopping, by default, the error will be thrown, which will likely kill the process.**  If you would like to override the default behavior (perhaps to integrate an error reporting tool), you may supply a custom `onError` function to handle the error instead.  However, since the consumer has already stopped, it is recommended that you **still kill the process** afterward to let the process manager handle the problem appropriately.

Some errors actually merit retrying, such as those caused by failed network requests or a [`VersionConflictError`](/extras?id=versionconflicterror).  Retrying should happen at the handler level, but should limit the number of tries to prevent hanging the consumer indefinitely.  Here's a brief example:

```js
const { backoff } = require('@articulate/funky')
const { is } = require('tinyfunk')

const { VersionConflictError } = require('../lib/hermes')

const handler = message => {
  // writes an event with an expectedVersion that conflicts
}

const handlerWithRetries =
  backoff({ limit: 3, when: is(VersionConflictError) }, handler)
```

## Entity

```haskell
Entity :: Object -> { clear, fetch }
```

Initializes an entity store with an object of options, and returns a interface with a `fetch` function.  Calling `fetch(id)` on an entity store is the primary means of querying for state in the message store.  The `fetch` function resolves with an `[entity, version]` pair, which are the projected entity and the current version of the stream.

```haskell
fetch :: String -> Promise [ a, Number ]
```

?> **An entity is not the same as a "model" or a "SQL table" in a CRUD system.**  It is instead a reduction of the events in a single stream using a particular projection.  If you have a background in functional programming, you may be familiar with the concept of a reducer: a projection is just a reducer.  Multiple entities may be created from the same events in a stream using different projections, but often you will only need one per component.

The events in the message store are the source of truth in an event-sourced system.  [Components](/core-concepts?id=service) (built with [consumers](/api?id=consumer)) often query the current state of the message store by projecting entities.  [Aggregators](/core-concepts?id=service) usually don't need to work with entities.

### Options / Example

| Option             | Type      | Default | Description                                                             |
|:-------------------|:----------|:--------|:------------------------------------------------------------------------|
| `cacheEnabled`     | `Boolean` | `true`  | Flag to enable in-memory LRU-cache                                      |
| `cacheLimit`       | `Number`  | `1000`  | Max size of in-memory LRU-cache                                         |
| `category`         | `String`  |         | Name of the category to read                                            |
| `handlers`         | `Object`  | `{}`    | Map of event types to reducers                                          |
| `init`             | `Any`     |         | Initial projection state                                                |
| `name`             | `String`  |         | Unique name used to store entity snapshots                              |
| `snapshotEnabled`  | `Boolean` | `true`  | Flag to enable snapshotting                                             |
| `snapshotInterval` | `Number`  | `100`   | Minimum number of messages since last snapshot before recording another |

```js
const { merge } = require('tinyfunk')

const { Entity } = require('../lib/hermes')

const init = {
  activated: false,
  activatedVersion: -1
}

const Activated = (entity, event) =>
  merge(entity, {
    activated: true,
    activatedVersion: event.globalPosition
  })

const Deactivated = (entity, event) =>
  merge(entity, {
    activated: false,
    activatedVersion: event.globalPosition
  })

const UserActivation =
  Entity({
    name: 'UserActivation',
    category: 'userActivation',
    init,
    handlers: {
      Activated,
      Deactivated
    }
  })

// elsewhere...
const [ entity, version ] = await UserActivation.fetch(userId)
```

?> **The "projection" is implemented in the above example as `init` and `handlers`.** Together they comprise the reducer with which events are rolled up into current state.

### Caching

To avoid projecting over every event in a stream every time, fetched entities will be cached in memory before resolving.  The next time the entity is fetched, it is first loaded from the cache, and then only new events are projected to update the entity.

Caching is enabled by default with a max size of 1000 cached entities, but can be disabled or configured as desired.

?> If you've enabled [mocking](/?id=mocking) to help test your [autonomous services](/core-concepts?id=service), then you may be clearing the store after each test.  With entity caching enabled as well, your entities may behave unexpectedly.  If so, you've run afowl of [one of the two hardest things in programming](https://www.martinfowler.com/bliki/TwoHardThings.html).  Avoid it by using the entity store's `clear` function to bust the cache.

```js
const hermes = require('@articulate/hermes')({
  mock: process.env.NODE_ENV === 'test'
})

const UserActivation =
  Entity({
    name: 'UserActivation',
    category: 'userActivation',
    init,
    handlers: { Activated, Deactivated }
  })

afterEach(() => {
  hermes.store.clear()
  UserActivation.clear()
})
```

### Snapshots

Entities are also periodically persistent to a durable cache in a process called snapshotting.  Snapshots are persisted as `Recorded` events on a stream of the form:

```js
`${name}:snapshot-${id}`
```

If caching is disabled or an entity is not found in the cache, a snapshot will be loaded before projecting over newer events.  Snapshots are enabled by default with an interval of 100 messages, but can be disabled or configured as desired.

## follow

```haskell
follow :: Message -> Message -> Message
```

Accepts a `prev` message and a `next` message, and returns a copy of `next` with [metadata](/core-concepts?id=message) included to track causation and correlation.

?> **Use `follow` to implement message workflows.**  When messages represent subsequent steps in a workflow, a subsequent message's metadata records elements of the preceding message's metadata. Each message in a workflow carries provenance data of the message that precedes it.

### Examples

```js
const Account = require('../entities/Account')
const { follow, writeMessage } = require('../lib/hermes')
const Opened = require('../events/Opened')

const handleOpen = async open => {
  const [ account, version ] = await Account.fetch(open.data.accountId)

  if (account.opened)
    return console.info('already opened, ignoring command: %o', open.id)

  let opened = Opened(open.data)
  opened = follow(open, opened)
  opened.expectedVersion = version
  await writeMessage(opened)
}
```

Note that `follow` is curried, so you can compose it like this if you prefer:

```js
const { assoc, pipe, prop } = require('tinyfunk')

const Account = require('../entities/Account')
const { follow, writeMessage } = require('../lib/hermes')
const Opened = require('../events/Opened')

const handleOpen = async open => {
  const [ account, version ] = await Account.fetch(open.data.accountId)

  if (account.opened)
    return console.info('already opened, ignoring command: %o', open.id)

  return pipe(
    prop('data'),
    Opened,
    follow(open),
    assoc('expectedVersion', version),
    writeMessage
  )(open)
}
```

!> **Notice:** In Hermes, `follow` does not copy `data` attributes, unlike the [Eventide implementation](http://docs.eventide-project.org/user-guide/messages-and-message-data/messages.html#message-workflows).

### Metadata Transfer

Provenance metadata is transfered to the subsequent message similar to below:

```js
next.metadata.causationMessageGlobalPosition = prev.globalPosition
next.metadata.causationMessagePosition = prev.position
next.metadata.causationMessageStreamName = prev.streamName
next.metadata.correlationStreamName = prev.metadata.correlationStreamName
next.metadata.replyStreamName = prev.metadata.replyStreamName
```

?>  This is intentionally compatible with the format of [provenance metadata in Eventide](http://docs.eventide-project.org/user-guide/messages-and-message-data/metadata.html#message-workflows).

## writeMessage

```haskell
writeMessage :: Message -> Promise Message
```

Writes a message to a named stream in the message store in an append-only manner, and resolves with a copy of the message with the autogenerated `id` included.

!> **This is the only means by which you should be writing to the message store.**  Streams of messages are [append-only and immutable by design](/core-concepts?id=stream).  If you find yourself asking, **"Why can't I update an event?"**, then I strongly recommend checking out Greg Young's answer to that question (and what you can do about it) in his free book, [_Versioning in an Event Sourced System_](https://leanpub.com/esversioning/read#leanpub-auto-why-cant-i-update-an-event).

### Attributes / Example

| Attribute         | Type     | Example                      | Description                                                                                                               |
|:------------------|:---------|:-----------------------------|:--------------------------------------------------------------------------------------------------------------------------|
| `streamName`      | `String` | `'userActivation-${userId}'` | Name of stream to which the message is written, see [naming guidelines](/best-practices?id=naming-things)                 |
| `type`            | `String` | `'Activated'`                | The type of the message, see [naming guidelines](/best-practices?id=naming-things)                                        |
| `data`            | `Any`    | `{ userId }`                 | JSON-serializable main data                                                                                               |
| `metadata`        | `Any`    | `{ traceId, userId }`        | JSON-serializable metadata                                                                                                |
| `expectedVersion` | `Number` | `0`                          | Expected version of the stream when written, used for [optimistic concurrency protection](/api?id=optimistic-concurrency) |

```js
const { writeMessage } = require('../lib/hermes')

const writeActivated = ({ traceId, userId }) =>
  writeMessage({
    streamName: `userActivation-${userId}`,
    type: 'Activated',
    data: { userId },
    metadata: { traceId, userId }
  })

const traceId = '7f05f368-7536-4e0a-a45d-39be622ccdf0'
const userId = '5e89a6b6-f2b9-402e-a8d1-0e7bf75641d5'

writeActivated({ traceId, userId })
// Resolves with { id: '39f0936c-0809-48a7-bea8-dab56ad7acd5', ...message }
```

### Optimistic Concurrency

Component message handlers frequently need to query the state of an event stream before writing new messages.  This is done by [projecting an entity](/api?id=entity), like this:

```js
const [ entity, version ] = await UserActivation.fetch(userId)
```

If another consumer instance has written to the same stream before you act on this projected state, then your state is stale, and you'll need to retry.  To do this, be sure to specify the `expectedVersion` of the stream on your message:

```js
writeMessage({
  streamName: `userActivation-${userId}`,
  type: 'Activated',
  data: { userId },
  metadata: { traceId, userId },
  expectedVersion: version // <-- right here
})
```

If the current stream version doesn't match, then `writeMessage` will reject with a [`VersionConflictError`](/extras?id=versionconflicterror) that you can [catch and retry](/api?id=error-handling).

### Initial Message

Sometimes you'll want to ensure that a particular message is the first in its stream, either to start off a new business process, or to implement the [reservation pattern](/idempotence-patterns).  To do so, set `{ expectedVersion: -1 }`.

?> **Don't forget:** the [version of an empty stream](/core-concepts?id=stream) is `-1`.

This is a common enough pattern than Hermes includes a `writeMessage.initial` function to simplify it for you:

```js
const { writeMessage } = require('../lib/hermes')

writeMessage.initial({
  streamName: `userId-${email}`,
  type: 'Linked',
  data: { userId, email }
})
```
