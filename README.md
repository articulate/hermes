# Hermes

Event-sourced autonomous service toolkit for Node.js

## Install

```
yarn add @articulate/hermes
```

## Setup

Follow the [setup instructions](https://github.com/message-db/message-db) for `message-db` to initialize the message store, or use [this Docker image](https://hub.docker.com/r/ethangarofolo/message-db) for local dev.  Then provide connection options as below:

```js
// server/lib/hermes.js

module.exports = require('@articulate/hermes')({
  connectionString: process.env.MESSAGE_STORE_URI
})
```

You'll need at least a `connectionString`, but see the following for the full list of available options:
- https://node-postgres.com/api/client
- https://node-postgres.com/api/pool

## Documentation

See the full documentation here: https://articulate.github.io/hermes/

You can also host the docs locally by cloning the repo and running:

```
npm i docsify-cli -g
yarn docs
```

Local docs will then be available at: http://localhost:4000
