const { assoc, dissoc } = require('tinyfunk')
const { expect } = require('chai')
const property = require('prop-factory')

const { query } = require('./lib/pg')
const Signup = require('./lib/Signup')
const { VersionConflictError, writeMessage } = require('./lib/hermes')

describe('writeMessage', () => {
  const msg = property()
  let valid

  beforeEach(() => {
    valid = Signup()
  })

  describe('when message.type is missing', () => {
    beforeEach(() =>
      writeMessage(dissoc('type', valid)).catch(msg)
    )

    it('rejects with a descriptive error', () => {
      expect(msg()).to.be.an('error')
      expect(msg().message).to.include('type')
    })
  })

  describe('with a valid message', () => {
    beforeEach(() =>
      writeMessage(valid).then(msg)
    )

    it('writes a message to the stream', async () => {
      const res = await query('SELECT count(*) from message_store.messages WHERE stream_name = $1', [ valid.streamName ])
      expect(Number(res[0].count)).to.equal(1)
    })

    it('resolves with the original message data', () => {
      expect(msg()).to.deep.include(valid)
    })

    it('includes the generated id in the response', () => {
      expect(msg().id).to.be.a.uuid('v4')
    })
  })

  describe('when the expectedVersion does not match', () => {
    beforeEach(() =>
      writeMessage(assoc('expectedVersion', 0, valid)).catch(msg)
    )

    it('rejects with a VersionConflictError', () => {
      expect(msg()).to.be.an.instanceof(VersionConflictError)
    })
  })

  describe('when the expectedVersion matches', () => {
    beforeEach(() =>
      writeMessage(assoc('expectedVersion', -1, valid)).then(msg)
    )

    it('writes a message to the stream', async () => {
      const res = await query('SELECT count(*) from message_store.messages WHERE stream_name = $1', [ valid.streamName ])
      expect(Number(res[0].count)).to.equal(1)
    })
  })
})
