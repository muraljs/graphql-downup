/* eslint-env mocha */
const Lokka = require('lokka').Lokka
const Transport = require('lokka-transport-http').Transport
const graphqlDownUp = require('../')
const graphqlHTTP = require('express-graphql')
const {
  GraphQLSchema,
  GraphQLString,
  GraphQLObjectType,
  GraphQLNumber
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
      person: new GraphQLObjectType({
        name: 'Person',
        args: {
          id: { type: GraphQLString }
        },
        fields: {
          name: { type: GraphQLString },
          age: { type: GraphQLNumber },
          birthday: { type: GraphQLString }
        },
        resolve: (source, args) => db[args.id]
      })
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
    app.use('/', graphqlHTTP({ schema: schema, graphiql: true }))
    server = app.listen(5000, () => done())
  })

  afterEach(() => {
    server.close()
  })

  it('resolves the schema-level resolves at the bottom of the stack', () => {
    return client.query(`{
      person(id: "hillary") {
        name
      }
    }`).then((res) => console.log(res))
  })
})
