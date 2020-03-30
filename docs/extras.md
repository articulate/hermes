# Extras

Aside from the [three main API functions](/api), Hermes also exports these extras.  Some are used internally and exposed just-in-case, while others you my find useful all the time.  It's up to you.

## getCategoryMessages

```haskell
getCategoryMessages :: Object -> Stream Message
```

Accepts an object of options and returns a [Highland Stream](http://highlandjs.org/) of messages.  Used internally by [consumers](/api?id=consumer) to poll the message store for new messages in a category.

!> **Uses a [Postgres cursor](https://node-postgres.com/api/cursor) to efficiently iterate over large categories.**  The cursor will close automatically at the end of the result set, but if you need to finish early for any reason, be sure to call the `stream.close()` function to avoid leaking the cursor.  See the example below.

| Option        | Type     | Default | Description                                                                                         |
|:--------------|:---------|:--------|:----------------------------------------------------------------------------------------------------|
| `batchSize`   | `Number` | `1000`  | Number of messages to retrieve in a single batch                                                    |
| `category`    | `String` |         | Category name from which to retrieve messages (required)                                            |
| `condition`   | `String` |         | SQL condition to filter the batch further                                                           |
| `correlation` | `String` |         | Filters the batch by a category or stream name recorded as `message.metadata.correlationStreamName` |
| `groupMember` | `Number` |         | Zero-based member number of an individual consumer in a consumer group                              |
| `groupSize`   | `Number` |         | Total size of a consumer group                                                                      |
| `position`    | `Number` | `1`     | Global position to start from                                                                       |

```js
const { getCategoryMessages } = require('../lib/hermes')

const stream = getCategoryMessages({
  category: `userActivation`,
  position: 100
}).flatMap(handleMessage)
  .stopOnError(() => stream.close())
  .done(() => console.log('done'))
```

?> If you'd rather work with a [Node Readable stream](https://devdocs.io/node/stream#stream_readable_streams) instead, then call `.toNodeStream({ objectMode: true })` on the result.  See the [Highland docs](http://highlandjs.org/#toNodeStream) for details.

## getLastStreamMessage

```haskell
getLastStreamMessage :: String -> Promise Message
```

Accepts a stream name, and resolves with the last message in the stream if available, or `undefined` if the stream is empty.  Used internally by [consumers](/api?id=consumer) to load their last known position, and by [entity stores](/api?id=entity) to [load snapshots](/api?id=snapshots).

```js
const { getLastStreamMessage } = require('../lib/hermes')

getLastStreamMessage(`userActivation-${userId}`).then(console.log)
```

## getStreamMessages

```haskell
getStreamMessages :: Object -> Stream Message
```

Accepts an object of options, and returns a [Highland Stream](http://highlandjs.org/) of messages.  Used internally by [entity stores](/api?id=entity) to project over the messages in an individual stream.

!> **Uses a [Postgres cursor](https://node-postgres.com/api/cursor) to efficiently iterate over large streams.**  The cursor will close automatically at the end of the result set, but if you need to finish early for any reason, be sure to call the `stream.close()` function to avoid leaking the cursor.  See the example below.

| Option       | Type     | Default | Description                                              |
|:-------------|:---------|:--------|:---------------------------------------------------------|
| `batchSize`  | `Number` | `1000`  | Number of messages to retrieve in a single batch         |
| `condition`  | `String` |         | SQL condition to filter the batch further                |
| `position`   | `Number` | `0`     | Stream position to start from                            |
| `streamName` | `String` |         | Name of stream from which to receive messages (required) |

```js
const { getStreamMessages } = require('../lib/hermes')

const stream = getStreamMessages({ streamName: `userActivation-${userId}` })
  .flatMap(handleMessage)
  .stopOnError(() => stream.close())
  .done(() => console.log('done'))
```

?> If you'd rather work with a [Node Readable stream](https://devdocs.io/node/stream#stream_readable_streams) instead, then call `.toNodeStream({ objectMode: true })` on the result.  See the [Highland docs](http://highlandjs.org/#toNodeStream) for details.

## streamVersion

```haskell
streamVersion :: String -> Promise Number
```

Accepts a `streamName`, and resolves with the highest position number in the stream.

?> [Stream positions](/event-sourcing?id=stream) start at `0`, so the version of an empty stream is `-1`.

Only use `streamVersion` if you need just the version and nothing else.  If you instead use an [entity store](/api?id=entity) to project over a stream and calculate current state, then the resolved `[ entity, version ]` pair will have aleady provided the version you need.

```js
const { streamVersion } = require('../lib/hermes')

streamVersion(`userActivation-${userId}`).then(console.log)
````

## VersionConflictError

If you [write a new message](/api?id=writemessage) and include an `expectedVersion` attribute to enable [optimistic concurrency protection](/api?id=optimistic-concurrency), then it will reject with a `VersionConflictError` if the stream version doesn't match the `expectedVersion`.  This likely means that a [competing consumer](/api?id=consumer-groups) has written to the same stream after you finished [projecting over it](/api?id=entity).

Fear not!  This is to be expected.  The solution is to retry, and this error constructor is exposed to make that simpler for you.  Below is one example demonstrating how to use it.

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

More details on error handling are also provided in the [consumer docs](/api?id=error-handling).
