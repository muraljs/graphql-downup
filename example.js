const app = require('express')()
const graphqlHTTP = require('express-graphql')
const { GraphQLSchema, GraphQLString, GraphQLObjectType } = require('graphql')
const graphqlDownUp = require('./')

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      name: {
        type: GraphQLString,
        resolve: () => 'Foo'
      },
      responseTime: {
        type: GraphQLString
      }
    }
  })
})

const api = graphqlDownUp(schema)

api.use((ctx, next) => {
  const start = new Date()
  return next().then(() => {
    const ms = new Date() - start
    ctx.res.responseTime = ms + 'ms'
  })
})

api.use((ctx, next) => {
  return next().then(() => { ctx.res.name = 'Bar' })
})

api.use((ctx, next) => {
  return delay(50).then(next)
})

app.use('/', graphqlHTTP({ schema: schema, graphiql: true }))
app.listen(3000, () => console.log('listening on 3000'))
