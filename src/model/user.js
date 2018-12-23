const { Schema } = require('mongoose')

const User = new Schema({
  _id: {
    type: String,
    match: /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
    required: true,
    lowercase: true,
    trim: true,
    maxLength: 64,
    alias: 'email'
  },
  friends: [{ type: String, ref: 'User' }],
  firstName: { type: String },
  lastName: { type: String },
  avatar: { type: String },
  created: { type: Date, default: Date.now },
  password: { type: String, required: true },
  admin: Boolean
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

module.exports = User
