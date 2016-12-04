/* eslint-env mocha */
const mapFieldASTs = require('../lib/map-field-asts')
const { parse } = require('graphql/language')

const getQuery = (query) => {
  const ast = parse(query)
  const selections = ast.definitions[0].selectionSet.selections
  return mapFieldASTs(selections)
}

describe('mapFieldASTs', () => {
  it('converts a parsed GraphQL query into a nice object', () => {
    const query = getQuery(
      `{
        hello {
          world
          metadata {
            email
            name
          }
        }
      }`
    )
    query.hello.fields.world.fields.should.be.empty()
    query.hello.fields.metadata.fields.email.fields.should.be.empty()
    query.hello.fields.metadata.fields.name.fields.should.be.empty()
  })

  it('converts a parsed GraphQL query into a nice object with aliases', () => {
    const query = getQuery(
      `{
        aliasName: hello {
          world
          metadata {
            email
            name
          }
        }
      }`
    )
    query.aliasName.hello.fields.world.fields.should.be.empty()
    query.aliasName.hello.fields.metadata.fields.email.fields.should.be.empty()
    query.aliasName.hello.fields.metadata.fields.name.fields.should.be.empty()
  })
})
