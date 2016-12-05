/* eslint-env mocha */
const should = require('should')
const Lokka = require('lokka').Lokka
const Transport = require('lokka-transport-http').Transport
const graphqlDownUp = require('../')
const graphqlHTTP = require('express-graphql')
const {
  GraphQLSchema,
  GraphQLString,
  GraphQLObjectType,
  GraphQLInt
} = require('graphql')

const db = {
  hillary: {
    name: 'Hillary Clinton',
    age: 68,
    birthday: new Date(1947, 9, 26)
  },
  elizabeth: {
    name: 'Elizabeth Warren',
    age: 67,
    birthday: new Date(1949, 5, 22)
  }
}

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      person: {
        args: {
          id: { type: GraphQLString }
        },
        type: new GraphQLObjectType({
          name: 'Person',
          fields: {
            name: { type: GraphQLString },
            age: { type: GraphQLInt },
            birthday: { type: GraphQLString }
          }
        }),
        resolve: (source, args) => db[args.id]
      },
      note: { type: GraphQLString }
    }
  })
})

const client = new Lokka({
  transport: new Transport('http://localhost:5000/')
})

describe('graphqlDownUp', () => {
  let api, server

  beforeEach((done) => {
    api = graphqlDownUp(schema)
    const app = require('express')()
    app.use('/', graphqlHTTP({ schema: api.schema, graphiql: true }))
    server = app.listen(5000, () => done())
  })

  afterEach(() => {
    server.close()
  })

  it('resolves the schema-level resolves at the bottom of the stack', (done) => {
    api.use((ctx, next) => {
      should.not.exist(ctx.res.person)
      return next().then(() => {
        ctx.res.person.name.should.equal('Hillary Clinton')
        done()
      })
    })
    client.query(`{
      person(id: "hillary") {
        name
      }
    }`)
  })

  it('uses downstream middleware', () => {
    api.use((ctx, next) => {
      ctx.res.note = 'Foo'
      return next()
    })
    return client.query(`{
      person(id: "hillary") {
        name
      }
      note
    }`).then((res) => {
      res.person.name.should.equal('Hillary Clinton')
      res.note.should.equal('Foo')
    })
  })

  it('uses upstream middleware', () => {
    api.use((ctx, next) => {
      ctx.res.note = 'Foo'
      return next().then(() => {
        ctx.res.note = 'Bar'
      })
    })
    return client.query(`{
      person(id: "hillary") {
        name
      }
      note
    }`).then((res) => {
      res.note.should.equal('Bar')
    })
  })

  it('resolves in the right order', () => {
    const order = []
    api.use((ctx, next) => {
      order.push(1)
      return next().then(() => {
        order.push(4)
      })
    })
    api.use((ctx, next) => {
      order.push(2)
      return next().then(() => {
        order.push(3)
      })
    })
    return client.query(`{
      person(id: "hillary") {
        name
      }
      note
    }`).then((res) => {
      order.should.eql([1, 2, 3, 4])
    })
  })
})
