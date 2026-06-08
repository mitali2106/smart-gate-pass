const express = require('express')
const router = express.Router()
const requireAuth = require('../middleware/auth')
const requireRole = require('../middleware/roleAuth')
const { recordEntry, getDashboard } = require('../controllers/securityController')
const { body } = require('express-validator')

const validateEntry = [
  body('workerId').notEmpty(),
  body('qrPayload').notEmpty()
]

router.post('/entry', requireAuth, requireRole(['security']), validateEntry, recordEntry)
router.get('/dashboard', requireAuth, requireRole(['security']), getDashboard)

module.exports = router