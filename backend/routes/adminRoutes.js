const express = require('express')
const router = express.Router()
const requireAuth = require('../middleware/auth')
const requireRole = require('../middleware/roleAuth')
const { getDashboard, approveList, overrideWorker } = require('../controllers/adminController')
const { body } = require('express-validator')

router.get('/dashboard', requireAuth, requireRole(['admin']), getDashboard)

router.post('/approve-list',
  requireAuth,
  requireRole(['admin']),
  body('listId').notEmpty(),
  approveList
)

router.post('/override-worker',
  requireAuth,
  requireRole(['admin']),
  body('workerId').notEmpty(),
  body('overrideReason').notEmpty(),
  overrideWorker
)

module.exports = router