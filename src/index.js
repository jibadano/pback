require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const jwt = require('express-jwt')
const { ApolloServer } = require('apollo-server-express')
const services = require('./services')

const app = express()
app.use(bodyParser.json())
app.use(jwt({
  credentialsRequired: false,
  secret: 'somesuperdupersecret'
}))

const server = new ApolloServer(services)
server.createGraphQLServerOptions = req => ({
  schema: server.schema,
  context: { session: req.user }
})

server.applyMiddleware({ app, path: '/graphql' })

app.listen(4000, () => {
  console.log(`🚀  Server ready at 4000 `)
})
