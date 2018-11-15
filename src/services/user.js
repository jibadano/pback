const { gql, AuthenticationError } = require('apollo-server')
const { User } = require('../model')
const jsonwebtoken = require('jsonwebtoken')

const typeDefs = gql`

  extend type Query {
    user(_id:ID): User
    me: Session
    validateEmail(_id:ID!): Boolean
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
    avatar:String,
    firstName: String
    lastName: String
  }

  type Session {
    user: User
    token: String
  }
`
const resolvers = {
  Query: {
    user: (_, args) => User.findOne(args).exec(),
    me: (obj, args, { session }, last) => {
      if (!session) return null
      let user = session.user
      if (!user) return null
      return { user, token: sign(user) }
    },
    validateEmail: (_, args) => User.findOne(args).exec().then(user => !Boolean(user))
  },
  Mutation: {
    login: async (obj, args, context, last) => {
      const user = await User.findOne(args).select("_id").exec()
      if (!user) return new AuthenticationError("Email or password is invalid")
      return { user, token: sign(user) }
    },
    signup: async (obj, args, context, info) => {
      let user = await new User(args).save()
      if (!user) return null
      return { user, token: sign(user) }
    },
    forgot: (obj, args, context, info) => { console.log(args) },
    updateUser: (obj, args, context, info) => User.updateOne({ _id: args._id }, args).exec(),
    deleteUser: (obj, args, context, info) => User.deleteOne(args).exec(),
  },
}

let sign = user => jsonwebtoken.sign({ user }, 'somesuperdupersecret', { expiresIn: '1y' })

module.exports = { typeDefs, resolvers }