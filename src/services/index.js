const { gql } = require('apollo-server')
const poll = require('./poll')
const comment = require('./comment')
const search = require('./search')
const user = require('./user')

const typeDefs = gql`
  type Query {
    version: String
  }

  type Mutation {
    version: String
  }
`
let version = () => '0.0.1'

const resolvers = {
  Query: {
    version
  },
  Mutation: {
    version
  },
}

exports.typeDefs = [typeDefs, poll.typeDefs, user.typeDefs, search.typeDefs, comment.typeDefs]
exports.resolvers = [resolvers, poll.resolvers, user.resolvers, search.resolvers, comment.resolvers]