# Event Sourcing

If you try to search for a good definition of "event sourcing", you'll likely receive a wide variety of poor answers.  I've found a few resources that do a fantastic job of explaining it, so instead of duplicating that information here, I suggest you go see them for yourself:

* **Barry O Sullivan** makes a good case for the what and why of event-sourcing in his blog post, [Event Sourcing: What it is and why it's awesome](https://dev.to/barryosull/event-sourcing-what-it-is-and-why-its-awesome).

* **Ethan Garofolo** provides a solid walk-through of designing an event-sourced system using Javascript in his book, [_Practical Microservices_](https://pragprog.com/book/egmicro/practical-microservices).

* **Scott Bellware** gives a clear explanation of evented autonomous services as implemented in Eventide, the inspiration behind Hermes, in this conference talk:

<div style="display: flex; justify-content: center;">
  <iframe width="560" height="315" src="https://www.youtube.com/embed/qgKlu5gFsJM" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

In addition, the Postgres event store [Message DB](https://github.com/message-db/message-db) which backs Hermes was extracted from [Eventide](https://eventide-project.org/).  The structure and terminology of Hermes were also heavily influenced by the feature-set and implementation of Eventide.  Consequently, the [Eventide documentation](http://docs.eventide-project.org/) contains a great storehouse of knowledge offering deeper insight into the underlying mechanics of Hermes.  I recommend that you peruse them as well.

Assuming you've been fully indoctrinated by the materials above, the remainder of this document will serve to explain event-sourcing as modeled in Message DB and Hermes.

## Service

> A **service** is a **process**.

More specifically, services implement business processes.  They _do_ things.  They cannot be asked for information, nor do they ask anything of anyone else.  Consequently services are **autonomous** by nature, acting by themselves, reacting only to messages in the event store.  If one service in your system goes down, the others continue unaffected.

!> **The word "service" is an overloaded term,** so it's important to make it very clear what services are not.  Services are not REST API's, containerized applications, web endpoints, or database models.  While common uses for the term, they do not fit the definition.

Services consume [streams](/event-sourcing?id=stream) of [messages](/event-sourcing?id=message) and then _do_ things based on those messages.  They are built using one or more [consumers](/api?id=consumer).  Services handle messages **idempotently**, so that previously processed messages can be handled again safely.

Services come in two flavors:

- **Components**, which are services that **perform work** initiated by **commands and events**.
- **Aggregators**, which are services that **update read-models** based on **events**.

[ TODO: include The Diagram™ here ]

## Stream

> A **stream** is a list of all the steps you took in a **process**.

More specifically, a stream is a **zero-indexed, ordered list of messages** describing every step in a **particular instance** of a process.  In Message DB, a stream is implemented as a `streamName` attribute on a message, as in the example below:

```json
{
  "streamName": "userActivation-ac954597-56bf-4ab3-aa72-00b0e6a5568d",
  "type": "Activated",
  "data": {
    "userId": "ac954597-56bf-4ab3-aa72-00b0e6a5568d"
  },
  "metadata": {
    "traceId": "7f05f368-7536-4e0a-a45d-39be622ccdf0",
    "userId": "5e89a6b6-f2b9-402e-a8d1-0e7bf75641d5"
  },
  "globalPosition": 123,
  "position": 0
}
```

By design, streams are **append only**.  Each message written to the stream is assigned the very next auto-incremented position.  The latest position in the stream is called the "stream version".  Because streams are zero-indexed, the version of an empty stream is `-1`.

In addition, streams of messages are **immutable**.  You may write messages, but you cannot update or delete them.  Doing so would compromise the integrity of the state in the message store, and would corrupt all later messages that may have depended on that state.  So if you find yourself asking, **"Why can't I update an event?"**, then I strongly recommend checking out Greg Young's answer to that question (and what you can do about it) in his free book, [_Versioning in an Event Sourced System_](https://leanpub.com/esversioning/read#leanpub-auto-why-cant-i-update-an-event).

### Category

?> Notice the format of the `streamName` above:  `${category}-${uniqueId}`

A category is a collection of streams that all belong to the same process.  The category to which a stream belongs is the portion of the `streamName` that appears before the first `-`.  Each [consumer](/api?id=consumer) processes a single specific category, handling messages in order by their `globalPosition`.

Streams come in two flavors:

- **Command streams**, which have `:command` appended to the main category
- **Event streams**, which are just the main category

For example, if you have a service/process called `UserActivation`, then:

- [**Commands**](/event-sourcing?id=command) would be written to the `userActivation:command` category
- [**Events**](/event-sourcing?id=event) would be written to the `userActivation` category

!> **Only one component should be responsible for writing to and processing a particular category of command streams.**  This is part of that "autonomy" thing discussed above.

## Message

A message is the smallest unit of design in an event-sourced system.  Messages are serializable as JSON, and only contain data.  While some messages convey intent, they do not actually have behavior.  Messages are plain Javascript objects with the following attributes:

| Attribute        | Type     | Description                                                                                               |
|:-----------------|:---------|:----------------------------------------------------------------------------------------------------------|
| `id`             | `UUID`   | Unique identifier for the message                                                                         |
| `streamName`     | `String` | Name of stream to which the message is written, see [naming guidelines](/best-practices?id=naming-things) |
| `type`           | `String` | The type of the message, see [naming guidelines](/best-practices?id=naming-things)                        |
| `data`           | `Any`    | JSON-serializable main data                                                                               |
| `metadata`       | `Any`    | JSON-serializable metadata                                                                                |
| `position`       | `Number` | Zero-indexed position of the message in the stream                                                        |
| `globalPosition` | `Number` | Global position of the message in the entire message store                                                |
| `time`           | `String` | Timestamp when the message was written                                                                    |

Messages come in two flavors:

- [**Commands**](/event-sourcing?id=command), which convey intent
- [**Events**](/event-sourcing?id=event), which record what actually happened

### Command

> A **command** is something you intend to do in a **process**.

Commands convey intent, so the `type` of a command should be an imperative verb.  The thing intended may not actually succeed, so commands do not connote state, and are not used by [aggregators](/event-sourcing?id=service) to update read-models.  After processing a command, a component will usually record an [event](/event-sourcing?id=event) denoting its success or failure:

| Example Command | Success Event | Failure Event        |
|:----------------|:--------------|:---------------------|
| `SignUp`        | `SignedUp`    | `SignupFailed`       |
| `Provision`     | `Provisioned` | `ProvisioningFailed` |
| `Eat`           | `Ate`         | `ConsumptionFailed`  |

?> **[Consumers](/api?id=consumer) restart all the time, and messages are frequently reprocessed,** so be sure to use [entities](/event-sourcing?id=entity) to project over the events and see if a command has previously been handled.  [See an example of that implemented here](/api?id=options-example).

### Event

> An **event** is something that actually happened in a **process**.

Events capture state in the message-store.  Since an event conveys that something has happened, whether it succeeded or failed, the `type` of an event should be a past-tense verb (see [examples above](/event-sourcing?id=command)).  Events are used by [aggregators](/event-sourcing?id=service) to update read-models, but they are also used by [components](/event-sourcing?id=service) to kick-off other asynchronous work.

?> **[Consumers](/api?id=consumer) restart all the time, and messages are frequently reprocessed,** so be sure to use [entities](/event-sourcing?id=entity) to project over the events and see if an event has previously been handled.  [See an example of that implemented here](/api?id=options-example).

## Entity

> An **entity** is a projection of the current state of a **process**.

The events in the message store are the source of truth in an event-sourced system.  [Components](/event-sourcing?id=service) (built with [consumers](/api?id=consumer)) often query the current state of the message store by projecting entities.  Entities represent business objects.  [Aggregators](/event-sourcing?id=service) usually don't need to work with entities.  Entities are fetched and cached using an [entity store](/api?id=entity).

?> **An entity is not the same as a "model" or a "SQL table" in a CRUD system.**  It is instead a reduction of the events in a single stream using a particular projection.  If you have a background in functional programming, you may be familiar with the concept of a reducer: a projection is just a reducer.  Multiple entities may be created from the same events in a stream using different projections, but often you will only need one per component.
