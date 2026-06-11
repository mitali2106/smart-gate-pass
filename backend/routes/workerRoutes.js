const express = require('express')
const router = express.Router()
const requireAuth = require('../middleware/auth')
const requireRole = require('../middleware/roleAuth')
const { addWorker, getWorkers, getWorkerById, updateWorker, deleteWorker } = require('../controllers/workerController')
const { body } = require('express-validator')
const Worker = require('../models/Worker')

const validateWorker = [
  body('name').notEmpty().trim().escape(),
  body('department').notEmpty().trim().escape(),
  body('idProofNumber').notEmpty().trim().escape(),
  body('idProofExpiry').isISO8601(),
  body('faceEncoding').isArray({ min: 128, max: 128 })
]

router.post('/', requireAuth, requireRole(['contractor']), validateWorker, addWorker)
router.get('/', requireAuth, requireRole(['contractor', 'admin']), getWorkers)
router.get('/all', requireAuth, requireRole(['gate_officer', 'admin', 'security']), async (req, res, next) => {
  try {
    const workers = await Worker.find({ status: 'Active' })
    res.json({ workers })
  } catch (err) {
    next(err)
  }
})
router.get('/:id', requireAuth, requireRole(['contractor', 'admin']), getWorkerById)
router.put('/:id', requireAuth, requireRole(['contractor', 'admin']), updateWorker)
router.delete('/:id', requireAuth, requireRole(['contractor']), deleteWorker)

module.exports = router