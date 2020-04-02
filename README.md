<p align="center">
  <a href="#">
    <img height="103px" src="https://user-images.githubusercontent.com/888052/77281533-a7da7a80-6c9d-11ea-874c-66475fa89d53.png"/>
  </a>
</p>

<p align="center">
  Event-sourced autonomous service toolkit for Node.js
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@articulate/hermes"><img src="https://img.shields.io/npm/v/@articulate/hermes" alt="npm version" style="max-width:100%;"></a>
  <a href="https://www.npmjs.com/package/@articulate/hermes"><img src="https://img.shields.io/npm/dm/@articulate/hermes" alt="npm downloads" style="max-width:100%;"></a>
  <a href="https://travis-ci.org/articulate/hermes"><img src="https://travis-ci.org/articulate/hermes.svg?branch=master" alt="Build Status" style="max-width:100%;"></a>
</p>

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

## Tests

The tests run in [Travis CI](https://travis-ci.org/github/articulate/hermes), but you can run the tests locally with `docker-compose` like so:

```
docker-compose build
docker-compose run --rm test
```
