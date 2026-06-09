const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const dotenv = require('dotenv')

dotenv.config()

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

const authRoutes = require('./routes/authRoutes')
const workerRoutes = require('./routes/workerRoutes')
const submissionRoutes = require('./routes/submissionRoutes')
const verificationRoutes = require('./routes/verificationRoutes')
const adminRoutes = require('./routes/adminRoutes')
const securityRoutes = require('./routes/securityRoutes')

app.use('/api/auth', authRoutes)
app.use('/api/workers', workerRoutes)
app.use('/api/submissions', submissionRoutes)
app.use('/api/verify', verificationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/security', securityRoutes)

app.use((err, req, res, next) => {
  console.error('ERROR:', err.message)
  console.error(err.stack)
  const status = err.status || 500
  const message = err.message || 'Internal Server Error'
  res.status(status).json({ error: message })
})

const PORT = process.env.PORT || 5000

if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4
  })
    .then(() => {
      console.log('Connected to MongoDB Atlas')
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`)
      })
    })
    .catch((err) => {
      console.error('MongoDB connection failed:', err.message)
      process.exit(1)
    })
}

module.exports = app