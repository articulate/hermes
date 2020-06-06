const { expect } = require('chai')
const spy = require('@articulate/spy')
const wait = require('util').promisify(setTimeout)

const { memory, postgres } = require('./lib/hermes')
const Signup = require('./lib/Signup')

const test = hermes => () => {
  const { Consumer, writeMessage } = hermes

  describe('when things go well', () => {
    let init, testSignup, UserSignup

    beforeEach(() => {
      init = spy()
      testSignup = spy()

      UserSignup = Consumer({
        name: 'UserSignup',
        category: 'userSignup:command',
        init,
        handlers: { Signup: testSignup },
        positionUpdateInterval: 3
      })

      return UserSignup.start()
    })

    afterEach(() =>
      UserSignup.stop()
    )

    it('awaits init to give aggregators time to initialize', () => {
      expect(init.calls.length).to.equal(1)
    })

    describe('when messages are written to the category', () => {
      let msg1, msg2, msg3

      beforeEach(async () => {
        msg1 = Signup()
        msg2 = Signup()
        msg3 = Signup()

        await writeMessage(msg1)
        await writeMessage(msg2)
        await writeMessage(msg3)
        await wait(400)
      })

      it('processes the messages in order', async () => {
        const { calls } = testSignup
        expect(calls.length).to.equal(3)
        expect(calls[0][0]).to.deep.include(msg1)
        expect(calls[1][0]).to.deep.include(msg2)
        expect(calls[2][0]).to.deep.include(msg3)
      })
    })

    describe('when restarted', () => {
      beforeEach(async () => {
        await writeMessage(Signup())
        await writeMessage(Signup())
        await writeMessage(Signup())
        await wait(200)
        UserSignup.stop()
        await wait(200)
        await writeMessage(Signup())
        await UserSignup.start()
        await wait(200)
      })

      it('loads the last recorded position before continuing', () => {
        expect(testSignup.calls.length).to.equal(4)
      })
    })
  })

  describe('when a handler rejects', () => {
    const onError = spy()

    const errors = () =>
      Promise.reject(new Error('bad'))

    const UserSignupErrors =
      Consumer({
        name: 'UserSignupErrors',
        category: 'userSignup:command',
        handlers: { Signup: errors },
        onError
      })

    beforeEach(async () => {
      await UserSignupErrors.start()
      await writeMessage(Signup())
      await wait(400)
    })

    afterEach(() => {
      onError.reset()
    })

    it('stops and calls onError if provided', async () => {
      expect(onError.calls.length).to.equal(1)
      expect(onError.calls[0][0].message).to.equal('bad')
      await writeMessage(Signup())
      await wait(200)
      expect(onError.calls.length).to.equal(1) // must have stopped
    })
  })
}

describe('Consumer', () => {
  describe('in memory', test(memory))
  describe('in postgres', test(postgres))
})
