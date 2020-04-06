const { assoc } = require('tinyfunk')
const { expect } = require('chai')

const { getLastStreamMessage, writeMessage } = require('./lib/hermes')
const Signup = require('./lib/Signup')

describe('getLastStreamMessage', () => {
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
})
