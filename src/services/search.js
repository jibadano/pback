const { gql, ApolloError } = require('apollo-server')
const { Poll, User } = require('../model')

const typeDefs = gql`
  extend type Query {
    search(term:String): [SearchItem]
  }

  type SearchItem {
    label: String
    value: String
    type: SearchType
  }

  enum SearchType{
    CATEGORY
    USER
  }
`

const categories = async term => Poll.aggregate([
  { $unwind: "$categories" },
  { $match: { "categories": { $regex: `^${term}.*` } } },
  { $group: { _id: "$categories", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 30 }
]).then(polls => polls.map(({ _id }) => ({ value: _id, label: _id, type: 'CATEGORY' })))


const users = term => User.aggregate([
  { $match: { _id: { $regex: `^${term}.*` } } },
  { $project: { _id: 1 } },
  { $limit: 30 }
]).then(users => users.map(({ _id }) => ({ value: _id, label: _id, type: 'USER' })))


const resolvers = {
  Query: {
    search: (_, { term }) => {
      console.log({term});
      if (!term) return []
      return Promise.all([users(term), categories(term)]).then(([users, categories]) => users.concat(categories))
    }
  }
}

module.exports = { typeDefs, resolvers }