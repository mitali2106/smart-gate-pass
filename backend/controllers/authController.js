const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Contractor = require('../models/Contractor')

const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role, contractorId: user.contractorId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  )
}

const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    process.env.REFRESH_SECRET,
    { expiresIn: '7d' }
  )
}

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, contractorName, licenseNumber, contactPhone } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    let contractorId = null

    if (role === 'contractor') {
      const contractor = await Contractor.create({
        name: contractorName,
        licenseNumber,
        contactEmail: email,
        contactPhone
      })
      contractorId = contractor._id
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      contractorId
    })

    res.status(201).json({
      message: 'User registered successfully',
      user
    })
  } catch (err) {
    next(err)
  }
}

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        contractorId: user.contractorId
      }
    })
  } catch (err) {
    next(err)
  }
}

const refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken
    if (!token) {
      return res.status(401).json({ error: 'No refresh token' })
    }

    const decoded = jwt.verify(token, process.env.REFRESH_SECRET)
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    const accessToken = generateAccessToken(user)
    const newRefreshToken = generateRefreshToken(user)

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({ accessToken })
  } catch (err) {
    next(err)
  }
}

const logout = async (req, res) => {
  res.clearCookie('refreshToken')
  res.json({ message: 'Logged out successfully' })
}

module.exports = { register, login, refresh, logout }