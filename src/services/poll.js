const { gql, ApolloError } = require('apollo-server')
const { Poll, User } = require('../model')
const { Types } = require('mongoose')
const { ObjectId } = Types

const typeDefs = gql`
  extend type Query {
    polls(categories:[String]): [Poll]
    explore(categories:[String]): [Poll]
    userPolls(user:ID, categories:[String]): [Poll]
    poll(_id:ID!): Poll
    categories(term:String): [String]
  }

  extend type Mutation {
    addPoll(question: String!, options: [InputOption], image: String, privacy: InputPrivacy): Poll
    updatePoll(_id:String): Poll
    deletePoll(_id:String): Poll
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
    poll: (_, args) => Poll.findOne(args).exec(),
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
    explore: (_, { categories }, { session }) => {
      const poll = { "$or": [{ "privacy.users": session.user._id }, { "privacy.poll": false }] }
      if (categories) poll.question = new RegExp('#' + categories.toString().replace(/,/g, "|#"))

      return Poll.find(poll)
        .sort('-date')
        .slice('comments', 1)
        .limit(10)
        .exec()
        .then(pollDocs => pollDocs.map(pollMap(session)))
    },
    categories: async (_, { term }) => {
      if (!term) return []

      const polls = await Poll.find({ question: { $regex: `.*#[0-9a-zA-Z\.\?\\/\$]?${term}.*` } })
        .select('question')
        .limit(50)
        .exec()
        .then(polls => polls || [])

      return polls.reduce((categories, { question }) => {
        question.split(/[ \n\t]/)
          .filter(c => c.includes('#') && !c.endsWith('#') && c.includes(term))
          .forEach(c => {
            const category = c.split('#')[1]
            if (!categories.includes(category))
              categories.push(category)
          })
        return categories
      }, [])
    }
  },
  Mutation: {
    addPoll: (_, args, { session }) => new Poll({ ...args, user: session.user._id }).save(),
    updatePoll: (_, args) => Poll.updateOne({ _id: args._id }, args).exec(),
    deletePoll: (_, args) => Poll.deleteOne(args).exec(),
    vote: async (_, { _id, option }, { session }) => {
      const poll = await Poll.findOne({ _id, "options.users": { $not: { $eq: session.user._id } } }).exec()
      if (!poll) return new ApolloError("already voted")

      const opt = poll.options.find(opt => opt._id == option)
      opt.users.push(session.user._id)
      poll.save()
      return pollMap(session)(poll)
    }
    ,
  },
}

module.exports = { typeDefs, resolvers }