const { add, evolve } = require('tinyfunk')
const { expect } = require('chai')
const spy = require('@articulate/spy')
const uuid = require('uuid')

const { Entity, streamVersion, writeMessage } = require('./lib/hermes')
const Viewed = require('./lib/Viewed')

describe('Entity', () => {
  let Viewing

  describe('when category is missing', () => {
    const buildEntity = () =>
      Entity({ name: 'Viewing' })

    it('throws an appropriate error', () => {
      expect(buildEntity).to.throw(/category/i)
    })
  })

  describe('when category is missing', () => {
    const buildEntity = () =>
      Entity({ category: 'viewing' })

    it('throws an appropriate error', () => {
      expect(buildEntity).to.throw(/name/i)
    })
  })

  describe('with no handlers', () => {
    beforeEach(() => {
      Viewing = Entity({
        name: 'Viewing',
        category: 'viewing',
        init: { views: 0 }
      })
    })

    it('safely defaults to an empty object of handlers', async () => {
      const [ entity, version ] = await Viewing.fetch('anything')
      expect(entity).to.eql({ views: 0 })
    })
  })

  describe('with no events', () => {
    beforeEach(() => {
      Viewing = Entity({
        name: 'Viewing',
        category: 'viewing',
        init: { views: 0 },
        handlers: {
          Viewed: evolve({ views: add(1) })
        }
      })
    })

    it('resolves with the init', async () => {
      const [ entity, version ] = await Viewing.fetch('anything')
      expect(entity).to.eql({ views: 0 })
    })

    it('also includes a version of -1', async () => {
      const [ entity, version ] = await Viewing.fetch('anything')
      expect(version).to.equal(-1)
    })
  })

  describe('with some events', () => {
    let videoId

    beforeEach(async () => {
      Viewing = Entity({
        name: 'Viewing',
        category: 'viewing',
        init: { views: 0 },
        handlers: {
          Viewed: evolve({ views: add(1) })
        }
      })

      videoId = uuid.v4()

      await writeMessage(Viewed(videoId))
      await writeMessage(Viewed(videoId))
      await writeMessage(Viewed(videoId))
      await writeMessage(Viewed())
    })

    it('projects over the events to build the entity', async () => {
      const [ entity, version ] = await Viewing.fetch(videoId)
      expect(entity).to.eql({ views: 3 })
    })

    it('also includes the version of the entity', async () => {
      const [ entity, version ] = await Viewing.fetch(videoId)
      expect(version).to.equal(2)
    })
  })

  describe('with caching and snapshots enabled', () => {
    let videoId

    beforeEach(async () => {
      Viewing = Entity({
        name: 'Viewing',
        category: 'viewing',
        init: { views: 0 },
        handlers: {
          Viewed: evolve({ views: add(1) })
        },
        cacheEnabled: true,
        snapshotEnabled: true
      })

      videoId = uuid.v4()

      await writeMessage(Viewed(videoId))
      await writeMessage(Viewed(videoId))
      await writeMessage(Viewed(videoId))
      await writeMessage(Viewed())
    })

    it('still always reads the latest events', async () => {
      const [ entity1, version1 ] = await Viewing.fetch(videoId)
      expect(entity1).to.eql({ views: 3 })
      expect(version1).to.equal(2)

      await writeMessage(Viewed(videoId))
      const [ entity2, version2 ] = await Viewing.fetch(videoId)
      expect(entity2).to.eql({ views: 4 })
      expect(version2).to.equal(3)
    })
  })

  describe('with caching configured', () => {
    let videoId, handleViewed

    beforeEach(async () => {
      handleViewed = spy()

      const incrementViews = entity => {
        handleViewed()
        return evolve({ views: add(1) }, entity)
      }

      Viewing = Entity({
        name: 'Viewing',
        category: 'viewing',
        init: { views: 0 },
        handlers: {
          Viewed: incrementViews
        },
        cacheEnabled: true,
        cacheLimit: 1,
        snapshotEnabled: false
      })

      videoId = uuid.v4()

      await writeMessage(Viewed(videoId))
      await writeMessage(Viewed(videoId))
      await writeMessage(Viewed(videoId))
      await writeMessage(Viewed())
    })

    it('caches the entity, only reading more recent events', async () => {
      await Viewing.fetch(videoId)
      expect(handleViewed.calls.length).to.equal(3)

      await writeMessage(Viewed(videoId))
      handleViewed.reset()
      await Viewing.fetch(videoId)
      expect(handleViewed.calls.length).to.equal(1)
    })

    it('configures the LRU-cache max-size with the cacheLimit', async () => {
      await Viewing.fetch(videoId)
      expect(handleViewed.calls.length).to.equal(3)

      await Viewing.fetch('different-id')
      handleViewed.reset()
      await Viewing.fetch(videoId)
      expect(handleViewed.calls.length).to.equal(3)
    })
  })

  describe('with snapshots configured', () => {
    let videoId, handleViewed

    beforeEach(async () => {
      handleViewed = spy()

      const incrementViews = entity => {
        handleViewed()
        return evolve({ views: add(1) }, entity)
      }

      Viewing = Entity({
        name: 'Viewing',
        category: 'viewing',
        init: { views: 0 },
        handlers: {
          Viewed: incrementViews
        },
        cacheEnabled: false,
        snapshotEnabled: true,
        snapshotInterval: 2
      })

      videoId = uuid.v4()

      await writeMessage(Viewed(videoId))
      await writeMessage(Viewed(videoId))
      await writeMessage(Viewed(videoId))
      await writeMessage(Viewed())
    })

    it('writes snapshots at least every snapshotInterval', async () => {
      await Viewing.fetch(videoId)
      expect(handleViewed.calls.length).to.equal(3)

      await writeMessage(Viewed(videoId))
      handleViewed.reset()
      await Viewing.fetch(videoId)
      expect(handleViewed.calls.length).to.equal(1)

      await writeMessage(Viewed(videoId))
      handleViewed.reset()
      await Viewing.fetch(videoId)
      expect(handleViewed.calls.length).to.equal(2)
    })

    it('writes snapshots to `${name}:snapshot-${id}`', async () => {
      await Viewing.fetch(videoId)
      const version = await streamVersion(`Viewing:snapshot-${videoId}`)
      expect(version).to.equal(0)
    })
  })
})
