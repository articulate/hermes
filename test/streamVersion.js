const { expect } = require('chai')

const Signup = require('./lib/Signup')
const { streamVersion, writeMessage } = require('./lib/hermes')

describe('streamVersion', () => {
  let command, version

  describe('when stream is empty', () => {
    beforeEach(async () => {
      version = await streamVersion('empty-stream')
    })

    it('the version is -1', () => {
      expect(version).to.equal(-1)
    })
  })

  describe('when stream has messages', () => {
    beforeEach(async () => {
      command = Signup()
      await writeMessage(command)
      await writeMessage(command)
      version = await streamVersion(command.streamName)
    })

    it('resolves with the correct stream version', () => {
      expect(version).to.equal(1)
    })
  })
})
