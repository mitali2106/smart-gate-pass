const Worker = require('../models/Worker')
const { validationResult } = require('express-validator')

const generateWorkerId = () => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `WRK-${timestamp}-${random}`
}

const addWorker = async (req, res, next) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { name, department, idProofNumber, idProofExpiry, faceEncoding } = req.body
    const photo = req.file ? req.file.path : req.body.photo

    if (!faceEncoding || faceEncoding.length !== 128) {
      return res.status(400).json({ error: 'Valid face encoding required (128 values)' })
    }

    const workerId = generateWorkerId()

    const worker = await Worker.create({
      workerId,
      name,
      photo,
      faceEncoding,
      contractorId: req.user.contractorId,
      department,
      idProofNumber,
      idProofExpiry,
      status: 'Active'
    })

    res.status(201).json({ message: 'Worker registered successfully', worker })
  } catch (err) {
    next(err)
  }
}

const getWorkers = async (req, res, next) => {
  try {
    const workers = await Worker.find({ contractorId: req.user.contractorId })
    res.json({ workers })
  } catch (err) {
    next(err)
  }
}

const getWorkerById = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id)
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' })
    }
    res.json({ worker })
  } catch (err) {
    next(err)
  }
}

const updateWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id)
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' })
    }

    if (req.user.role === 'contractor' &&
        worker.contractorId.toString() !== req.user.contractorId.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this worker' })
    }

    const allowedUpdates = ['name', 'department', 'idProofNumber', 'idProofExpiry', 'status']
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        worker[field] = req.body[field]
      }
    })

    await worker.save()
    res.json({ message: 'Worker updated successfully', worker })
  } catch (err) {
    next(err)
  }
}

const deleteWorker = async (req, res, next) => {
  try {
    const worker = await Worker.findById(req.params.id)
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' })
    }

    if (worker.contractorId.toString() !== req.user.contractorId.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this worker' })
    }

    await Worker.findByIdAndDelete(req.params.id)
    res.json({ message: 'Worker deleted successfully' })
  } catch (err) {
    next(err)
  }
}

module.exports = { addWorker, getWorkers, getWorkerById, updateWorker, deleteWorker }