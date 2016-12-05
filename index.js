const { assign, debounce, cloneDeep, each, values } = require('lodash')
const mapFieldASTs = require('./lib/map-field-asts')
const { buildMiddlewares, addMiddleware } = require('./lib/middleware')

module.exports = (_schema) => {
  const schema = cloneDeep(_schema)
  // Start creating a stack of middleware building up a `req` object that
  // will be used in the `ctx` of our middleware.
  let middlewares = []
  let req = {}
  let finish

  // Coalesce all of the individual resolves within a single frame of execution
  // then resolve the whole middleware stack at the end. This is a similar
  // concept to how Facebook's DataLoader works.
  const coalesce = debounce(() => {
    finish = buildMiddlewares(middlewares)(cloneDeep(req))
    req = {}
  })

  // Iterate through each schema and modify the resolve function to instead
  // add itself to the bottom of the middleware stack and build up the final
  // coalesced resolution.
  each(values(schema._queryType._fields), (field, i) => {
    const originalResolve = field.resolve
    middlewares.push((ctx, next) => next())
    field.resolve = (source, args, root, opts) => {
      const { fieldNodes: fieldASTs } = opts
      const alias = fieldASTs[0].alias && fieldASTs[0].alias.value
      const key = alias || fieldASTs[0].name.value

      // Add the original resolve function to the bottom of the middleware stack
      middlewares[(middlewares.length - 1) - i] = (ctx, next) => {
        if (!originalResolve) return next()
        const original = originalResolve(source, args, root, opts)
        return Promise.resolve(original).then((res) => {
          ctx.res[key] = res
          return next()
        })
      }

      // Build up the `ctx.req` object from the GraphQL AST
      assign(req, mapFieldASTs(fieldASTs))

      // Defer resolution to the final coalesce resolve
      coalesce()

      // Wait a tick after the coalesced resolve occurs, then after the
      // `final` promise resolves return the relevant value from `ctx.res`.
      if (!source) {
        return new Promise((resolve, reject) => setTimeout(() => {
          finish
            .then((res) => resolve(res[key]))
            .catch(reject)
        }))

      // Leaf fields from schemas pass through the parent `ctx.res` data
      } else return source[key]
    }
  })
  return { use: addMiddleware(middlewares), schema }
}
