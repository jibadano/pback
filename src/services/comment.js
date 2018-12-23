const { gql } = require('apollo-server')
const { Poll, User } = require('../model')
const { Types } = require('mongoose')
const { ObjectId } = Types

const PAGE_SIZE = 2

const typeDefs = gql`
  extend type Query {
    comments(_id:ID!, page:Int): Comments
  }

  extend type Mutation {
    addComment(_id:ID!, comment:String!): Comment
  }
  
  type Comment {
    _id: ID
    text: String
    user: ID
  }

  type Comments {
    page: Int,
    size: Int,
    hasMore: Boolean,
    list: [Comment]
  }
`

const resolvers = {
  Query: {
    comments: async (obj, { _id, page = 1 }) => {
      const result = { page, list: [] }
      const count = page * PAGE_SIZE
      let poll = await Poll.findOne({ _id }).select('comments').slice('comments', -(count + 1)).exec()
      if (poll) result.list = poll.comments.slice(1, count + 1)
      result.hasMore = poll.comments.length > count
      result.size = PAGE_SIZE
      return result
    }
  },
  Mutation: {
    addComment: async (obj, args, { session }, info) => {
      let result = await Poll.findOneAndUpdate({ _id: args._id }, { $push: { comments: { text: args.comment, user: session.user._id } } }, { new: true }).slice('comments', -1).exec()
      return result.comments[0]
    }
  },
}

module.exports = { typeDefs, resolvers }