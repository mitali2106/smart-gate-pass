const express = require('express')
const router = express.Router()
const requireAuth = require('../middleware/auth')
const requireRole = require('../middleware/roleAuth')
const { getDashboard, approveBatch } = require('../controllers/adminController')
const { body } = require('express-validator')

const validateBatch = [
  body('workerIds').isArray({ min: 1 }).withMessage('At least one worker ID required')
]

router.get('/dashboard', requireAuth, requireRole(['admin']), getDashboard)
router.post('/approve-batch', requireAuth, requireRole(['admin']), validateBatch, approveBatch)

module.exports = router