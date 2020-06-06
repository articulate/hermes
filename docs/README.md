<style>
  @font-face {
    font-family: GentiumPlus-I;
    src: url("fonts/GentiumPlus-I.woff") format("woff");
  }
</style>

<h1 style="align-items: center; color: var(--theme-color); display: flex; font-family: GentiumPlus-I; font-size: 68px; justify-content: center; line-height: 1;">
  <img src="images/icon.svg" height="100px" alt="Hermes" style="margin-right: -11px"/>Ἑρμῆς
</h1>

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

Follow the [setup instructions](https://github.com/message-db/message-db) for Message DB to initialize the message store, or use [this Docker image](https://hub.docker.com/r/articulate/message-db) for local dev.  Then provide connection options as below:

```js
// server/lib/hermes.js

module.exports = require('@articulate/hermes')({
  connectionString: process.env.MESSAGE_STORE_URI
})
```

You'll need at least a `connectionString`, but see the following for the full list of available options:
- https://node-postgres.com/api/client
- https://node-postgres.com/api/pool

**Note:** You may alternatively specify the connection options using [standard Postgres environment variables](https://www.postgresql.org/docs/current/libpq-envars.html).

## Documentation

See the full documentation here: https://articulate.github.io/hermes/

You can also host the docs locally by cloning the repo and running:

```
npm i docsify-cli -g
yarn docs
```

Local docs will then be available at: http://localhost:4000

## Logging

Hermes uses the [`debug`](https://github.com/visionmedia/debug) library to output raw logs.  To turn on all of the logs, include the following environment variable:

```
DEBUG=hermes:*
```

When debugging locally, these additional variables may also help.  See the `debug` docs for [the full list of options](https://github.com/visionmedia/debug/#environment-variables).

```
DEBUG_COLORS=true
DEBUG_DEPTH=null
DEBUG_HIDE_DATE=true
```

## Mocking

To help you test your [autonomous services](/core-concepts?id=service), Hermes ships with an in-memory substitute that passes [the same test suite](https://github.com/articulate/hermes/tree/master/test) as the default Message DB implementation.  Enable it with the `{ mock: true }` flag.  When enabled, Hermes will ignore any connection options specified, and will not connect to Postgres.

In addition, you may clear the in-memory store after each test using `hermes.store.clear()`.

```js
const hermes = require('@articulate/hermes')({
  mock: process.env.NODE_ENV === 'test'
})

afterEach(() => {
  hermes.store.clear()
})
```

**Read more** about testing with Hermes in the section on [entity caching](/api?id=caching).

!> **Not for production use.**  The in-memory substitute implementation is only intended for testing.

## Tests

The [Hermes tests](https://github.com/articulate/hermes/tree/master/test) run in [Travis CI](https://travis-ci.org/github/articulate/hermes), but you can run the tests locally with `docker-compose` like so:

```
docker-compose build
docker-compose run --rm test
```
