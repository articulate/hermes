const chai = require('chai')
chai.use(require('chai-uuid'))

const hermes = require('./lib/hermes')
const pg = require('./lib/pg')

afterEach(() =>
  Promise.all([
    hermes.memory.store.clear(),
    pg.query('TRUNCATE message_store.messages RESTART IDENTITY')
  ])
)

after(() =>
  Promise.all([
    hermes.postgres.cleanup(),
    pg.cleanup()
  ])
)
