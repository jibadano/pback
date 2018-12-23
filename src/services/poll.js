const { gql, ApolloError } = require('apollo-server')
const { Poll, User } = require('../model')

const typeDefs = gql`
  extend type Query {
    polls(categories:[String]): [Poll]
    explore(categories:[String], users:[ID]): [Poll]
    userPolls(user:ID, categories:[String]): [Poll]
  }

  extend type Mutation {
    addPoll(question: String!, options: [InputOption], image: String, privacy: InputPrivacy): Poll
    deletePoll(_id:ID!): Poll
    vote(_id:ID!, option:ID!): Poll
  }

  type Poll {
    _id: ID
    voted: Boolean
    question: String
    options: [Option]
    image:String,
    user: ID
    date: String
    privacy: Privacy
    comments:[Comment]
  }

  type Privacy {
    poll: Boolean
    results: Boolean
    users: [User]
  }

  type Option {
    _id: ID
    text: String
    desc: String
    votes: Float
    users: [ID]
  }

  input InputPrivacy {
    poll: Boolean
    results: Boolean
    users: [String]
  }

  input InputOption {
    text: String
  }
`

const alreadyVoted = (poll, user) => poll.options.some(option => option.users.some(vote => vote === user))
const pollMap = session => input => {
  if (!input) return null
  const poll = input.toObject()
  poll.voted = alreadyVoted(poll, session.user._id)
  const totalVotes = poll.options.reduce((partial, option) => partial + option.users.length, 0)
  poll.options.forEach(option => {
    option.votes = poll.voted ? (totalVotes ? option.users.length / totalVotes : 0) : null
    option.users = poll.voted ? option.users.slice(3) : []
  })
  return poll
}


const resolvers = {
  Query: {
    polls: (_, { categories }, { session }) => {
      const poll = { user: { $in: [session.user.friends, session.user._id] }, "$or": [{ "privacy.users": session.user._id }, { "user": session.user._id }, { "privacy.poll": false }] }
      if (categories) poll.question = new RegExp('#' + categories.toString().replace(/,/g, "|#"))

      return Poll.find(poll)
        .sort('-date')
        .slice('comments', 1)
        .limit(50)
        .exec()
        .then(pollDocs => pollDocs.map(pollMap(session)))
    },
    userPolls: (_, { user, categories }, { session }) => {
      let poll = { user: session.user._id }

      if (user)
        poll = { user, "$or": [{ "privacy.users": session.user._id }, { "privacy.poll": false }] }

      if (categories) poll.question = new RegExp('#' + categories.toString().replace(/,/g, "|#"))

      return Poll.find(poll)
        .sort('-date')
        .slice('comments', 1)
        .limit(50)
        .exec()
        .then(pollDocs => pollDocs.map(pollMap(session)))
    },
    explore: (_, { categories, users }, { session }) => {
      const poll = { "$or": [{ "privacy.users": session.user._id }, { "privacy.poll": false }] }
      if (categories) poll.question = new RegExp('#' + categories.toString().replace(/,/g, "|#"))
      if (users) poll.user = { "$in": users }

      return Poll.find(poll)
        .sort('-date')
        .slice('comments', 1)
        .limit(10)
        .exec()
        .then(pollDocs => pollDocs.map(pollMap(session)))
    }
  },
  Mutation: {
    addPoll: (_, args, { session }) => new Poll({ ...args, user: session.user._id }).save(),
    deletePoll: (_, args, { session }) => Poll.deleteOne({ ...args, user: session.user._id }).exec(),
    vote: async (_, { _id, option }, { session }) =>
      Poll.findOneAndUpdate({ _id, "options._id": option, "options.users": { $not: { $eq: session.user._id } } },
        { $push: { "options.$.users": session.user._id } }, { new: true }).exec().then(pollMap(session))
  }
}

module.exports = { typeDefs, resolvers }