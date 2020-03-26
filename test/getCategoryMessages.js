const _ = require('highland')
const { assoc } = require('tinyfunk')
const { expect } = require('chai')

const { getCategoryMessages, writeMessage } = require('./lib/hermes')
const Signup = require('./lib/Signup')

describe('getCategoryMessages', () => {
  it('returns a Highland stream', done => {
    const messages = getCategoryMessages({ category: 'empty' })
    expect(_.isStream(messages)).to.be.true
    messages.done(done)
  })

  describe('when the stream has messages', () => {
    let msg1, msg2, msg3, msg4

    beforeEach(async () => {
      msg1 = Signup()
      msg2 = assoc('type', 'SignedUp', msg1)
      msg3 = assoc('type', 'WelcomeEmailSent', msg1)
      msg4 = assoc('streamName', 'different-stream', msg1)

      await writeMessage(msg1)
      await writeMessage(msg2)
      await writeMessage(msg3)
      await writeMessage(msg4)
    })

    it('streams over the messages in order', done => {
      getCategoryMessages({ category: 'userSignup' })
        .toArray(messages => {
          expect(messages.length).to.equal(3)
          expect(messages[0]).to.deep.include(msg1)
          expect(messages[1]).to.deep.include(msg2)
          expect(messages[2]).to.deep.include(msg3)
          done()
        })
    })

    it('streams starting from a given position', done => {
      getCategoryMessages({ category: 'userSignup', position: 2 })
        .toArray(messages => {
          expect(messages.length).to.equal(2)
          expect(messages[0]).to.deep.include(msg2)
          expect(messages[1]).to.deep.include(msg3)
          done()
        })
    })

    it('streams limited by batchSize', done => {
      getCategoryMessages({ batchSize: 2, category: 'userSignup' })
        .toArray(messages => {
          expect(messages.length).to.equal(2)
          expect(messages[0]).to.deep.include(msg1)
          expect(messages[1]).to.deep.include(msg2)
          done()
        })
    })
  })
})
