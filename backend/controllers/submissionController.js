const DailyWorkerList = require('../models/DailyWorkerList')
const Worker = require('../models/Worker')

const getStartOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const getEndOfDay = (date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

const submitList = async (req, res, next) => {
  try {
    const { workerIds } = req.body
    const contractorId = req.user.contractorId
    const now = new Date()
    const today = getStartOfDay(now)

    const cutoff = new Date(today)
    cutoff.setHours(8, 0, 0, 0)

    if (now > cutoff) {
      return res.status(400).json({ error: 'Submission deadline passed. Lists must be submitted before 6 AM.' })
    }

    const existing = await DailyWorkerList.findOne({
      date: today,
      contractorId
    })

    if (existing) {
      return res.status(400).json({ error: 'List already submitted for today. Use edit to make changes.' })
    }

    for (const workerId of workerIds) {
      const worker = await Worker.findById(workerId)
      if (!worker) {
        return res.status(400).json({ error: `Worker ${workerId} not found` })
      }
      if (worker.status === 'Blacklisted') {
        return res.status(400).json({ error: `Worker ${worker.name} is blacklisted` })
      }
      if (new Date(worker.idProofExpiry) < now) {
        return res.status(400).json({ error: `Worker ${worker.name} has expired ID` })
      }
    }

    const list = await DailyWorkerList.create({
      date: today,
      contractorId,
      workers: workerIds,
      submittedAt: now,
      version: 1,
      status: 'Pending'
    })

    res.status(201).json({ message: 'List submitted successfully', list })
  } catch (err) {
    next(err)
  }
}

const getSubmissions = async (req, res, next) => {
  try {
    const submissions = await DailyWorkerList.find({
      contractorId: req.user.contractorId
    }).populate('workers').sort({ createdAt: -1 })

    res.json({ submissions })
  } catch (err) {
    next(err)
  }
}

const editSubmission = async (req, res, next) => {
  try {
    const { workerIds, reason } = req.body
    const list = await DailyWorkerList.findById(req.params.id)

    if (!list) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    if (list.contractorId.toString() !== req.user.contractorId.toString()) {
      return res.status(403).json({ error: 'Not authorized' })
    }

    if (list.status === 'Recalled') {
      return res.status(400).json({ error: 'Cannot edit a recalled list' })
    }

    list.editHistory.push({
      editedAt: new Date(),
      reason: reason || 'No reason provided',
      prevWorkers: list.workers
    })

    list.workers = workerIds
    list.version += 1

    await list.save()
    res.json({ message: 'Submission updated successfully', list })
  } catch (err) {
    next(err)
  }
}

module.exports = { submitList, getSubmissions, editSubmission }