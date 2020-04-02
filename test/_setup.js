const chai = require('chai')
chai.use(require('chai-uuid'))

const hermes = require('./lib/hermes')
const pg = require('./lib/pg')

afterEach(() =>
  pg.query('TRUNCATE message_store.messages RESTART IDENTITY')
)

after(() =>
  Promise.all([
    hermes.cleanup(),
    pg.cleanup()
  ])
)

const { pick } = require('tinyfunk')
console.log(pick(['MESSAGE_STORE_URI', 'TEST_DB_URI'], process.env))
