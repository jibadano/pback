const { gql, ApolloError } = require("apollo-server");
const { Poll, User } = require("../model");
const PAGE_SIZE = 5;

const typeDefs = gql`
  extend type Query {
    polls(users: [ID], categories: [String], offset: Int): [Poll]
  }

  extend type Mutation {
    addPoll(
      question: String!
      options: [InputOption]
      image: String
      privacy: InputPrivacy
    ): Poll
    deletePoll(_id: ID!): Poll
    vote(_id: ID!, option: ID!): Poll
  }

  type Poll {
    _id: ID
    voted: Boolean
    question: String
    options: [Option]
    image: String
    user: ID
    date: String
    privacy: Privacy
    comments: [Comment]
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
    selected: Boolean
  }

  input InputPrivacy {
    poll: Boolean
    results: Boolean
    users: [String]
  }

  input InputOption {
    text: String
  }
`;

const alreadyVoted = (poll, user) =>
  poll.options.some(option => option.users.some(vote => vote === user));

const pollMap = session => input => {
  if (!input) return null;
  const poll = input.toObject();
  poll.voted = alreadyVoted(poll, session.user._id);
  const totalVotes = poll.options.reduce(
    (partial, option) => partial + option.users.length,
    0
  );
  poll.options.forEach(option => {
    option.votes = poll.voted
      ? totalVotes
        ? option.users.length / totalVotes
        : 0
      : null;
    option.selected =
      poll.voted &&
      option.users &&
      option.users.some(vote => vote === session.user._id);
    option.users = poll.voted ? option.users.slice(3) : [];
  });
  return poll;
};

const resolvers = {
  Query: {
    polls: (_, { categories, users, offset }, { session }) => {
      let poll = {};
      if (categories)
        poll.$and = [
          {
            $or: [
              { "privacy.users": session.user._id },
              { "privacy.poll": false }
            ]
          },
          {
            $or: categories.map(category => ({
              categories: { $regex: `^${category}.*` }
            }))
          }
        ];
      else
        poll = {
          $or: [
            { user: session.user._id },
            { "privacy.users": session.user._id },
            { "privacy.poll": false }
          ]
        };

      if (users) poll.user = { $in: users };

      return Poll.find(poll)
        .sort("-date")
        .slice("comments", 1)
        .skip(offset || 0)
        .limit(PAGE_SIZE)
        .exec()
        .then(pollDocs => pollDocs.map(pollMap(session)));
    }
  },
  Mutation: {
    addPoll: (_, args, { session }) =>
      new Poll({ ...args, user: session.user._id }).save(),
    deletePoll: (_, args, { session }) =>
      Poll.deleteOne({ ...args, user: session.user._id }).exec(),
    vote: async (_, { _id, option }, { session }) =>
      Poll.findOneAndUpdate(
        {
          _id,
          "options._id": option,
          "options.users": { $not: { $eq: session.user._id } }
        },
        { $push: { "options.$.users": session.user._id } },
        { new: true }
      )
        .exec()
        .then(pollMap(session))
  }
};

module.exports = { typeDefs, resolvers };
