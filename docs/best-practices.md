# Best Practices

Perhaps "best practices" is a bit pretentious.  As Captain Barbosa would say:

<img alt="more like guidelines" src="https://user-images.githubusercontent.com/888052/77218190-04536380-6aff-11ea-8490-f9903b76cce4.jpg" width="480px">

## Naming Things

As one of the [two hardest things in programming](https://www.martinfowler.com/bliki/TwoHardThings.html), naming things gets a bit easier with guidelines in place.  These guidelines were passed down to me by others with more experience.  The main thing to keep in mind here is that your system implements one or more business **processes**:

?> A **component** is another name for a service, and a **service** is a **process**.<br/>
A **stream** is a list of all the steps you took in a **process**.<br/>
A **command** is something you intend to do in a **process**.<br/>
An **event** is something that actually happened in a **process**.<br/>
An **entity** is a projection of the current state of a **process**.

Noticing a pattern?  I hope so.  Now delete all those CRUD and SQL table words from your vocabulary, and instead follow these guidelines when you model your processes.


| Thing     | Example(s)                 | Guidelines                                           |
|:----------|:---------------------------|:-----------------------------------------------------|
| Component | `UserActivation`           | Singular noun of the process, Pascal-case            |
| Category  | `userActivation`           | Camel-case of the component name                     |
| Entity    | `UserActivation`           | Same as the component, unless you need more than one |
| Command   | `Activate`, `Deactivate`   | Imperative verb, no object                           |
| Event     | `Activated`, `Deactivated` | Past-tense verb, no object                           |

?> **The exception would be Aggregators.**  Their sole job is to update read-models, so it's best just to name them after the read-models.

## Message Contracts

The commands and events in your message store are more than just the means of communicating intent and state in your system.  They are also the means of communication between developers in your organization.  Message contracts define the boundaries between autonomous services, which also means they define the interfaces between the moving parts assembled by each individual and team you work with.

Collectively modeling and then **writing down** the location, shape, and purpose of your messages will free your group to work in parallel on related components of the system.  The components that write the messages and the components that read the messages can be built by different devs - or even different teams - because you will all be working against the same contract.

?> **By way of example, I've included the messages contracts for Hermes below.**  They really can be this simple, and Markdown makes for easy formatting.  Be sure to include the **stream names**, **message types**, and **example message shapes**.  Brief descriptions of **message purpose** and notes on **attribute data types** will go a long way toward clarifying and confirming everyone's understanding of the contract.

### Consumer

Individual consumer stream name: `${category}+position-${name}`<br/>
Group member stream name: `${category}+position-${name}-${groupMember}:${groupSize}`

#### Recorded

Records the latest stream position processed by the consumer.

```json
{
  "streamName": "userActivation+position-UserActivation",
  "type": "Recorded",
  "data": {
    "position": 100 // number
  },
  "metadata": null
}
```

### Entity

Stream name: `${name}:snapshot-${id}`

#### Recorded

Records a snapshot of an entity to avoid repeatedly projecting over a large stream.

```json
{
  "streamName": "UserActivation:snapshot-41074497-38a1-44e8-b4af-73003f154602",
  "type": "Recorded",
  "data": {
    "entity": { "activated": true },              // any
    "id": "41074497-38a1-44e8-b4af-73003f154602", // uuid
    "time": "2020-03-16T02:05:42.380Z",           // iso datetime
    "version": 123                                // number
  },
  "metadata": null
}
```
