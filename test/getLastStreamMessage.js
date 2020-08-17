const { assoc } = require('tinyfunk')
const { expect } = require('chai')

const { memory, postgres } = require('./lib/hermes')
const Signup = require('./lib/Signup')

const test = hermes => () => {
  const { getLastStreamMessage, writeMessage } = hermes
  let command, message

  describe('when stream is empty', () => {
    beforeEach(async () => {
      message = await getLastStreamMessage('empty-stream')
    })

    it('resolves undefined', () => {
      expect(message).to.be.undefined
    })
  })

  describe('when stream has messages', () => {
    beforeEach(async () => {
      command = Signup()
      await writeMessage(assoc('type', 'NotSignup', command))
      await writeMessage(command)
      message = await getLastStreamMessage(command.streamName)
    })

    it('resolves with the latest message', () => {
      expect(message).to.deep.include(command)
    })
  })
}

describe('getLastStreamMessage', () => {
  describe('in memory', test(memory))
  describe('in postgres', test(postgres))
})
