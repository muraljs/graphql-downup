const { assign, debounce, cloneDeep, each } = require('lodash')
const mapFieldASTs = require('./lib/map-field-asts')
const { buildMiddlewares, addMiddleware } = require('./lib/middleware')

module.exports = (schema) => {
  const middlewares = []
  let req = {}
  let finish
  const aggregate = debounce(() => {
    finish = buildMiddlewares(middlewares)(cloneDeep(req))
    req = {}
  })
  each(schema._queryType._fields, (field) => {
    const originalResolve = field.resolve
    field.resolve = (source, args, root, opts) => {
      const { fieldNodes: fieldASTs } = opts
      const alias = fieldASTs[0].alias && fieldASTs[0].alias.value
      const key = alias || fieldASTs[0].name.value
      assign(req, mapFieldASTs(fieldASTs))
      aggregate()
      if (!source) {
        return new Promise((resolve, reject) => setTimeout(() => {
          finish
            .then((res) => {
              resolve(res[key] || originalResolve(source, args, root, opts))
            })
            .catch(reject)
        }))
      } else return source[key]
    }
  })
  return { use: addMiddleware(middlewares) }
}
