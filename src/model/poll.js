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
  }],
  categories: [String]
})

Poll.pre('save', function (next) {
  const categories = []
  const question = this.question || ''
  question.split(/[ \n\t]/)
    .filter(c => c.includes('#') && !c.endsWith('#'))
    .forEach(c => {
      const category = c.split('#')[1]
      if (!categories.includes(category))
        categories.push(category)
    })
  this.categories = categories.length ? categories : null
  next()
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