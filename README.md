# graphql-downup

Use Koa 2 style downstream/upstream middleware to resolve GraphQL.


## Example

````javascript
const app = require('express')()
const graphqlHTTP = require('express-graphql')
const graphqlDownUp = require('graphqlDownUp')

const schema = new GraphQLSchema()
const api = graphqlDownUp(schema)

api.use(async (ctx, next) => {
  const start = new Date()
  // schema-level resolve functions are run at the bottom of the middleware stack
  await next()
  const ms = new Date() - start
  // `ctx.res` represents the final JSON blob returned from GrapHQL
  ctx.res.responseTime = ms + 'ms'
})

app.use('/', graphqlHTTP({
  schema: api.schema, // Note to use of a new GraphQL schema object
  graphiql: true
}))
app.listen(3000)
````

## Explained

Unlike schema-level resolves, GraphQL DownUp resolves schemas all at once through [Koa 2](https://github.com/koajs/koa)-like middleware at the root level. This introduces some interesting design pattern benefits you get with Koa's approach to middleware such as elegant solutions for implementing caching, logging, optimized data loading, a foundation for plugins, etc..

Middleware functions resolve in the same way Koa 2 middleware does. Calling `next` will pass control to the next middleware function and `await` the rest of the downstream middleware code to finish. Once the downstream middleware code is finished any schema-level resolve functions are run and control flows back upstream resolving the `await`ed middleware code.

Finally notice how we mutate `ctx.res`. This is how you resolve queries in GraphQL DownUp—the `ctx.res` object represents the final data blob being returned from the GraphQL query. Each middleware builds up the `ctx.res` object which gets sent as the GraphQL JSON response after all the middlewares resolve.

````javascript
api.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date - start
  console.log(`Request took ${ms}`)
})
api.use(async (ctx) => {
  ctx.res.person = await Person.findOne({ id: ctx.req.query.person.id })
})
````

## API

### ctx.req

An object representing the parsed GraphQL query, For instance a query like...

```
mutation {
  artwork(
    title: "Skull"
    date: "1976-02-01T05:00:00.000Z"
  ) {
    title
  }
}
```

Would be parsed into an object that looks like

```
{
  mutation: {
    artwork: {
      args: {
        title: "Skull",
        date: "1976-02-01T05:00:00.000Z"
      },
      fields: {
        title: { args: {}, fields {} }
      }
    }
  }
}
```

### ctx.res

An object passed through middleware used to build up the final response.

### ctx.state

The recommended namespace for passing information through middleware.

## TODO

* Better errors (right now one error batches up the same response for every query)

## Contributing

Please fork the project and submit a pull request with tests. Install node modules `npm install` and run tests with `npm test`.

## License

MIT
