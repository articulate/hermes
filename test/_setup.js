const chai = require('chai')
chai.use(require('chai-uuid'))

const hermes = require('./lib/hermes')
const pg = require('./lib/pg')

afterEach(() =>
  pg.query('TRUNCATE message_store.messages RESTART IDENTITY')
)

after(() => {
  hermes.cleanup()
  pg.cleanup()
})
