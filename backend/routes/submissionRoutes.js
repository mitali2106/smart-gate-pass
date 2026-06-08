const express = require('express')
const router = express.Router()
const requireAuth = require('../middleware/auth')
const requireRole = require('../middleware/roleAuth')
const { submitList, getSubmissions, editSubmission } = require('../controllers/submissionController')
const { body } = require('express-validator')

const validateSubmission = [
  body('workerIds').isArray({ min: 1 }).withMessage('At least one worker required')
]

router.post('/', requireAuth, requireRole(['contractor']), validateSubmission, submitList)
router.get('/', requireAuth, requireRole(['contractor']), getSubmissions)
router.put('/:id', requireAuth, requireRole(['contractor']), editSubmission)

module.exports = router