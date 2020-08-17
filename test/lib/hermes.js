const hermes = require('../..')

const memory = hermes({ mock: true })
const postgres = hermes({ connectionString: process.env.MESSAGE_STORE_URI })

module.exports = { memory, postgres }
