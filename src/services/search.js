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
    count: Int
  }

  enum SearchType{
    CATEGORY
    USER
  }
`

const search = term => Poll.aggregate([
  { $facet: {
    "users":[
         { $match: {user: { $regex: `^${term}.*` }} },
         { $group:{_id:'$user', count:{$sum:1}}},
         { $sort: {count:-1} },
         { $limit: 5 }
     ],
     "categories":[
         { $unwind: "$categories" },
         { $match: {categories: { $regex: `^${term}.*` }} },
         { $group: { _id: '$categories', count:{$sum:1}}},
         { $sort: {count:-1} },
         { $limit: 5 }
     ]
 }
}
]).then(searchResult => {
  const users = searchResult[0].users.map(({ _id, count }) => ({ value: _id, label: _id, type: 'USER', count }))
  const categories = searchResult[0].categories.map(({ _id }) => ({ value: _id, label: _id, type: 'CATEGORY' }))
  return users.concat(categories)
})

const resolvers = {
  Query: {
    search: (_, { term }) => {
      if (!term) return []
      return search(term)
    }
  }
}

module.exports = { typeDefs, resolvers }