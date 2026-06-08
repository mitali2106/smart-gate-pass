const express = require('express')
const router = express.Router()
const { register, login, refresh, logout } = require('../controllers/authController')
const { body, validationResult } = require('express-validator')
const rateLimit = require('express-rate-limit')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again after 15 minutes.' }
})

const handleValidation = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

const validateRegister = [
  body('name').notEmpty().trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['contractor', 'gate_officer', 'admin', 'security']),
  handleValidation
]

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  handleValidation
]

router.post('/register', validateRegister, register)
router.post('/login', loginLimiter, validateLogin, login)
router.post('/refresh', refresh)
router.post('/logout', logout)

module.exports = router