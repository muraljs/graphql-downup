//
// Converts, and validates using Joi, a parsed GraphQL query (via the GraphQL.js
// AST object), into something easier to traverse and inspect.
//
// e.g. A query like this...
//
// {
//   artist(id: "andy-warhol") {
//     name
//     artworks(limit: 100) {
//       title
//     }
//   }
// }
//
// Would be validated and parsed into...
//
// {
//   artist: {
//     args: { id: 'andy-warhol' },
//     fields: {
//       artworks: {
//         args: { limit: 100 },
//         fields: { title: {} }
//       }
//     }
//   }
// }
//
const { map, uniq, assign } = require('lodash')

// Converts a GraphQL AST "selection" into the easier-to-traverse value
// described above.
const selectionToValue = (selection) => {
  const fns = {
    IntValue: () => selection.value,
    StringValue: () => selection.value,
    BooleanValue: () => selection.value,
    ListValue: () => map(selection.values, selectionToValue),
    ObjectValue: () => assign(...map(selection.fields, (field) =>
      ({ [field.name.value]: selectionToValue(field.value) })))
  }
  if (!fns[selection.kind]) {
    throw new Error(`Unsupported kind ${selection.kind}`)
  }
  return fns[selection.kind]()
}

// Recursively traverses a `fieldASTs` object from GraphQL.js and outputs
// the easier-to-traverse object described above.
const mapFieldASTs = (selections) => {
  const kinds = uniq(map(selections, 'kind')).join('')
  if (kinds === 'InlineFragment') {
    return selections.map((s) => mapFieldASTs(s.selectionSet.selections))
  }
  const mapped = assign(...map(selections, (selection) => {
    const alias = selection.alias
    const key = selection.name.value
    const args = assign(...map(selection.arguments, (arg) =>
      ({ [arg.name.value]: selectionToValue(arg.value) })))
    const fields = selection.selectionSet
        ? mapFieldASTs(selection.selectionSet.selections)
        : {}
    if (alias) {
      return { [alias.value]: { [key]: { args, fields } } }
    } else {
      return { [key]: { args, fields } }
    }
  }))
  return mapped
}

module.exports = mapFieldASTs
