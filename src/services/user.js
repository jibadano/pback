const { gql, AuthenticationError } = require('apollo-server')
const { User, Poll } = require('../model')
const jsonwebtoken = require('jsonwebtoken')
const get = require('lodash/get')

const typeDefs = gql`

  extend type Query {
    user(_id:ID): User
    me: Session
    exists(_id:ID): Boolean
  }

  extend type Mutation {
    login(_id: ID, password:String): Session
    signup(_id: ID!, password: String!, firstName: String, lastName:String, avatar:String): Session
    forgot(_id: ID!): String
    updateUser(_id: ID, password: String, firstName: String, lastName:String, avatar:String): User
    deleteUser(_id: ID): User
  }

  type User {
    _id: ID!
    avatar:String
    firstName: String
    lastName: String
    contrast: Contrast
  }

  type Session {
    user: User
    token: String
  }

  scalar Contrast
`
const resolvers = {
  Query: {
    user: async (_, { _id }, { session }) => {
      const user = await User.findOne({ _id }).exec()
      if (!user) return user

      return Poll.aggregate([
        {
          $facet: {
            "userInterests": [
              { $unwind: '$categories' },
              { $match: { "options.users": _id } },
              { $sortByCount: "$categories" }
            ],
            "userTotalVoted": [
              { $match: { "options.users": _id } },
              { $count: "total" }
            ],
            "userTotalPolls": [
              { $match: { "user": _id } },
              { $count: "total" }
            ],
            "myInterests": [
              { $unwind: '$categories' },
              { $match: { "options.users": session.user._id } },
              { $sortByCount: "$categories" }
            ],
            "myTotalPolls": [
              { $match: { "options.users": session.user._id } },
              { $count: "total" }
            ],
            "commonInterests": [
              { $unwind: '$categories' },
              { $match: { $and: [{ "options.users": _id }, { "options.users": session.user._id }] } },
              { $sortByCount: "$categories" }
            ],
            "commonVotes": [
              { $unwind: '$categories' },
              { $unwind: "$options" },
              { $match: { "options.users": { $all: [_id, session.user._id] } } },
              { $sortByCount: "$categories" }
            ]
          }
        }
      ]).then(facets => {
        const { userInterests, myInterests, commonInterests, userTotalPolls, userTotalVoted, commonVotes } = facets[0]
        user.contrast = {
          voted: userTotalVoted[0].total,
          polls: userTotalPolls[0].total,
          interests: userInterests.map(({ _id, count }) => ({ name: _id, interest: count / userTotalVoted[0].total })),
          common: commonInterests.map(({ _id }) => ({ name: _id })),
        }
        return user
      })
    },
    me: (_, __, context) => {
      const user = get(context, 'session.user')
      return user && { user, token: sign(user) }
    },
    exists: (_, args) => User.findOne(args).exec().then(user => Boolean(user))
  },
  Mutation: {
    login: async (_, args) => {
      const user = await User.findOne(args).select("_id").exec()
      if (!user) return new AuthenticationError("Email or password is invalid")
      return { user, token: sign(user) }
    },
    signup: async (_, args) => {
      let user = await new User(args).save()
      if (!user) return null
      return { user, token: sign(user) }
    },
    forgot: (_, args) => { console.log(args) },
    updateUser: (_, { _id, ...update }) => User.updateOne({ _id }, update).exec(),
    deleteUser: (_, args) => User.deleteOne(args).exec(),
  },
}

const sign = user => jsonwebtoken.sign({ user }, 'somesuperdupersecret', { expiresIn: '1y' })

module.exports = { typeDefs, resolvers }