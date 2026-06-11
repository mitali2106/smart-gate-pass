const GatePass = require('../models/GatePass')
const VerificationRecord = require('../models/VerificationRecord')
const Worker = require('../models/Worker')
const DailyWorkerList = require('../models/DailyWorkerList')
const jwt = require('jsonwebtoken')

const getStartOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const generatePassNumber = () => {
  const date = new Date().toISOString().slice(0, 10)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `GP-${date}-${random}`
}

const getDashboard = async (req, res, next) => {
  try {
    const today = getStartOfDay(new Date())

    const pendingLists = await DailyWorkerList.find({
      date: today,
      status: 'Pending'
    }).populate('contractorId').populate('workers')

    const approvedLists = await DailyWorkerList.find({
      date: today,
      status: 'Approved'
    }).populate('contractorId').populate('workers')

    const needsReview = await VerificationRecord.find({
      date: today,
      verificationStatus: 'NeedsReview'
    }).populate('workerId')

    const approvedPasses = await GatePass.find({
      date: today,
      status: 'Approved'
    }).populate('workerId')

    res.json({ pendingLists, approvedLists, needsReview, approvedPasses })
  } catch (err) {
    next(err)
  }
}

const approveList = async (req, res, next) => {
  try {
    const { listId } = req.body
    const adminId = req.user.userId

    const list = await DailyWorkerList.findById(listId).populate('workers')
    if (!list) {
      return res.status(404).json({ error: 'List not found' })
    }

    if (list.status === 'Approved') {
      return res.status(400).json({ error: 'List already approved' })
    }

    list.status = 'Approved'
    await list.save()

    res.json({
      message: `List approved successfully. ${list.workers.length} workers authorized for today.`,
      list
    })
  } catch (err) {
    next(err)
  }
}

const overrideWorker = async (req, res, next) => {
  try {
    const { workerId, overrideReason } = req.body
    const adminId = req.user.userId
    const today = getStartOfDay(new Date())

    if (!overrideReason || !overrideReason.trim()) {
      return res.status(400).json({ error: 'Override reason is required' })
    }

    const worker = await Worker.findById(workerId)
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' })
    }

    if (worker.status === 'Blacklisted') {
      return res.status(400).json({ error: 'Blacklisted workers cannot be overridden' })
    }

    const existingPass = await GatePass.findOne({ workerId, date: today })
    if (existingPass) {
      return res.status(400).json({ error: 'Gate pass already exists for this worker today' })
    }

    const passNumber = generatePassNumber()
    const expiresAt = new Date(today)
    expiresAt.setHours(23, 59, 59, 999)

    const qrPayload = jwt.sign(
      { passNumber, workerId: workerId.toString(), date: today.toISOString() },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    const gatePass = await GatePass.create({
      passNumber,
      workerId,
      date: today,
      status: 'Approved',
      qrPayload,
      entryUsed: false,
      approvedBy: adminId,
      overrideReason,
      expiresAt
    })

    await VerificationRecord.findOneAndUpdate(
      { workerId, date: today },
      { verificationStatus: 'Matched' }
    )

    res.json({
      message: 'Worker overridden and gate pass generated',
      gatePass
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getDashboard, approveList, overrideWorker }