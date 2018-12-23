const express = require('express')
const router = express.Router()
const passport = require('passport')
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

const { User } = require('../model')
const jsonwebtoken = require('jsonwebtoken')
const get = require('lodash/get')

passport.serializeUser(function (user, done) {
  done(null, user._id);
})

passport.deserializeUser(function (_id, done) {
  User.find({ _id }).exec().then(user => {
    done(null, user)
  })
})

// Facebook Strategy

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_ID,
  clientSecret: process.env.FACEBOOK_SECRET,
  callbackURL: "http://localhost:4000/auth/facebook/callback",
  profileFields: ['id', 'emails', 'name']
},
  function (accessToken, refreshToken, profile, done) {
    User.findOne({ _id: `${profile.id}@gmail.com` }).exec().then(user => {
      if (user) return done(null, user)

      return new User({ _id: `${profile.id}@gmail.com`, firstName: profile.first_name, lastName: profile.last_name, password: 'sarasa' })
        .save()
        .then(user => done(null, user))
    })
  }
));

router.get('/auth/facebook', passport.authenticate('facebook'))
router.get('/auth/facebook/callback',
  passport.authenticate('facebook'), (req, res) => {
    var user = req.user
    var token = jsonwebtoken.sign({ user }, 'somesuperdupersecret', { expiresIn: '1y' })

    res.redirect('http://localhost:3000?token=' + token)
  })


// Google Strategy

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_ID,
  clientSecret: process.env.GOOGLE_SECRET,
  callbackURL: "http://localhost:4000/auth/google/callback",
  profileFields: ['id', 'emails', 'name']
},
  function (accessToken, refreshToken, profile, done) {
    console.log(profile.photos.map(p => p.value));
    User.findOne({ _id: `${profile.id}@gmail.com` }).exec().then(user => {
      if (user) return done(null, user)

      return new User({ _id: `${profile.id}@gmail.com`, firstName: get(profile, 'name.givenName'), lastName: get(profile, 'name.familyName'), avatar: get(profile, 'photos.0.value'), password: 'sarasa' })
        .save()
        .then(user => done(null, user))
    })
  }
));

router.get('/auth/google', passport.authenticate('google',{ scope: ['https://www.googleapis.com/auth/plus.login'] }))
router.get('/auth/google/callback',
  passport.authenticate('google'), (req, res) => {
    var user = req.user
    var token = jsonwebtoken.sign({ user }, 'somesuperdupersecret', { expiresIn: '1y' })

    res.redirect('http://localhost:3000?token=' + token)
  })

module.exports = { auth: router, passport }  