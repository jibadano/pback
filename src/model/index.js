const mongoose = require('mongoose')
const PollSchema = require('./poll')
const UserSchema = require('./user')

const {DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME } = process.env

mongoose.connect(`mongodb://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

let Poll = mongoose.model('Poll', PollSchema)
let User = mongoose.model('User', UserSchema)

module.exports = { Poll, User }