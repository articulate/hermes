const { mapObj, merge, pipe, thrush } = require('tinyfunk')

const debug = require('../../lib/debug').extend('db')

const db = {
  getCategoryMessages: require('./getCategoryMessages'),
  getLastStreamMessage: require('./getLastStreamMessage'),
  getStreamMessages: require('./getStreamMessages'),
  streamVersion: require('./streamVersion'),
  writeMessage: require('./writeMessage')
}

const dbFactory = () => {
  const store = {
    lastMessage: null,
    messages: [],
    streams: new Map()
  }

  store.clear = () => {
    store.lastMessage = null
    store.messages.length = 0
    store.streams.clear()
    debug('store cleared')
  }

  return pipe(
    mapObj(thrush(store)),
    merge({ store })
  )(db)
}

module.exports = dbFactory
