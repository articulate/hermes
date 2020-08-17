const { assocPath, pipe, prop } = require('tinyfunk')
const { expect } = require('chai')
const uuid = require('uuid')

const { memory: { follow, store, writeMessage } } = require('./lib/hermes')

describe('follow', () => {
  const Rename = ({ name, userId }) =>
    ({
      streamName: `displayName:command-${userId}`,
      type: 'Rename',
      data: { name, time: new Date(), userId },
    })

  const Renamed = ({ name, time, userId }) =>
    ({
      streamName: `displayName-${userId}`,
      type: 'Renamed',
      data: { name, processedTime: new Date(), time, userId }
    })

  let cmd, evt

  describe('tracks precedence', () => {
    beforeEach(async () => {
      await writeMessage(
        Rename({
          name: `Anonymous-${Math.floor(Math.random() * 10)}`,
          userId: uuid.v4()
        })
      )

      cmd = store.lastMessage

      evt = pipe(
        prop('data'),
        Renamed,
        follow(cmd)
      )(cmd)
    })

    it('includes metadata.causationMessageGlobalPosition', () => {
      expect(evt.metadata.causationMessageGlobalPosition).to.equal(cmd.globalPosition)
    })

    it('includes metadata.causationMessagePosition', () => {
      expect(evt.metadata.causationMessagePosition).to.equal(cmd.position)
    })

    it('includes metadata.causationMessageStreamName', () => {
      expect(evt.metadata.causationMessageStreamName).to.equal(cmd.streamName)
    })

    it('does not mind if correlationStreamName is absent', () => {
      expect(evt.metadata.correlationStreamName).to.be.undefined
    })

    it('does not mind if replyStreamName is absent', () => {
      expect(evt.metadata.replyStreamName).to.be.undefined
    })
  })

  describe('when correlationStreamName provided', () => {
    beforeEach(async () => {
      cmd = Rename({
        name: `Anonymous-${Math.floor(Math.random() * 10)}`,
        userId: uuid.v4()
      })

      cmd.metadata = { correlationStreamName: `category-${uuid.v4()}` }

      await writeMessage(cmd)

      cmd = store.lastMessage

      evt = pipe(
        prop('data'),
        Renamed,
        follow(cmd)
      )(cmd)
    })

    it('includes metadata.correlationStreamName', () => {
      expect(evt.metadata.correlationStreamName).to.equal(cmd.metadata.correlationStreamName)
    })
  })

  describe('when replyStreamName provided', () => {
    beforeEach(async () => {
      cmd = Rename({
        name: `Anonymous-${Math.floor(Math.random() * 10)}`,
        userId: uuid.v4()
      })

      cmd.metadata = { replyStreamName: `category-${uuid.v4()}` }

      await writeMessage(cmd)

      cmd = store.lastMessage

      evt = pipe(
        prop('data'),
        Renamed,
        follow(cmd)
      )(cmd)
    })

    it('includes metadata.replyStreamName', () => {
      expect(evt.metadata.replyStreamName).to.equal(cmd.metadata.replyStreamName)
    })
  })

  describe('with extra metadata', () => {
    beforeEach(async () => {
      cmd = Rename({
        name: `Anonymous-${Math.floor(Math.random() * 10)}`,
        userId: uuid.v4()
      })

      await writeMessage(cmd)

      cmd = store.lastMessage

      evt = pipe(
        prop('data'),
        Renamed,
        assocPath(['metadata', 'otherStuff'], 'untouched'),
        follow(cmd)
      )(cmd)
    })

    it('leaves it untouched', () => {
      expect(evt.metadata.otherStuff).to.equal('untouched')
    })
  })
})
