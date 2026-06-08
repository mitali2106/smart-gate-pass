const express = require('express')
const router = express.Router()
const requireAuth = require('../middleware/auth')
const requireRole = require('../middleware/roleAuth')
const { submitScan, getPendingVerifications } = require('../controllers/verificationController')
const { body } = require('express-validator')

const validateScan = [
  body('workerId').notEmpty(),
  body('confidence').isFloat({ min: 0, max: 100 }),
  body('livenessPass').isBoolean()
]

router.post('/scan', requireAuth, requireRole(['gate_officer']), validateScan, submitScan)
router.get('/pending', requireAuth, requireRole(['gate_officer']), getPendingVerifications)

module.exports = router