const { Schema } = require('mongoose')
const { ObjectId } = Schema.Types

const PRIVACY_VALUES = ['private', 'public', 'draft']

const Poll = new Schema({
  user: { type: String, ref: 'User' },
  date: { type: Date, default: Date.now },
  image: String,
  question: String,
  privacy: {
    poll: Boolean,
    results: Boolean,
    users: [{ type: String, ref: 'User' }]
  },
  options: [{ text: String, desc: String, users: [{ type: String, ref: 'User' }] }],
  comments: [{
    text: String,
    date: { type: Date, default: Date.now },
    user: { type: String, ref: 'User' }
  }]
})

/* // a setter
Comment.path('name').set(function (v) {
  return capitalize(v);
});

// middleware
Comment.pre('save', function (next) {
  notify(this.get('email'));
  next();
}); */

module.exports = Poll