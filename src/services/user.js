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
      if (!user || session.user._id === _id) return user

      return Poll.aggregate([
        { $unwind: '$categories' },
        {
          $facet: {
            "interests": [
              { $group: { _id: '$categories', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            "userInterests": [
              { $match: { "options.users": session.user._id } },
              { $group: { _id: '$categories', count: { $sum: 1 } } },
              { $sort: { count: -1 } }],
            "comparingInterests": [
              { $match: { "options.users": _id } },
              { $group: { _id: '$categories', count: { $sum: 1 } } },
              { $sort: { count: -1 } }],
            "commonInterests": [
              { $match: { $and: [{ "options.users": session.user._id }, { "options.users": _id }] } },
              { $group: { _id: '$categories', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            "commonVotes": [
              { $unwind: "$options" },
              { $match: { "options.users": { $all: [session.user._id, _id] } } },
              { $group: { _id: '$categories', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ]
          }
        }
      ]).then(facets => {
        const { interests, userInterests, comparingInterests, commonInterests, commonVotes } = facets[0]
        const userInterestsCount = userInterests.reduce((acc, cur) => acc + cur.count, 0)
        const comparingInterestsCount = comparingInterests.reduce((acc, cur) => acc + cur.count, 0)
        const totalInterestsCount = userInterestsCount + comparingInterestsCount
        contrast.interests = userInterests.map(f => ({ category: f._id, avg: f.count / userInterestsCount }))
        contrast.commonInterests = commonInterests.map(f => ({category: f._id, avg: f.count/ totalInterestsCount}))
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