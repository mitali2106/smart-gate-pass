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

    const matched = await VerificationRecord.find({
      date: today,
      verificationStatus: 'Matched'
    }).populate('workerId')

    const needsReview = await VerificationRecord.find({
      date: today,
      verificationStatus: 'NeedsReview'
    }).populate('workerId')

    const approved = await GatePass.find({
      date: today,
      status: 'Approved'
    }).populate('workerId')

    res.json({ matched, needsReview, approved })
  } catch (err) {
    next(err)
  }
}

const approveBatch = async (req, res, next) => {
  try {
    const { workerIds, overrideReason } = req.body
    const adminId = req.user.userId
    const today = getStartOfDay(new Date())
    const results = { approved: [], failed: [] }

    for (const workerId of workerIds) {
      try {
        const worker = await Worker.findById(workerId)

        if (!worker) {
          results.failed.push({ workerId, reason: 'Worker not found' })
          continue
        }

        if (worker.status === 'Blacklisted') {
          results.failed.push({ workerId, reason: 'Worker is blacklisted' })
          continue
        }

        const existingPass = await GatePass.findOne({ workerId, date: today })
        if (existingPass) {
          results.failed.push({ workerId, reason: 'Pass already exists for today' })
          continue
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
          overrideReason: overrideReason || null,
          expiresAt
        })

        await VerificationRecord.findOneAndUpdate(
          { workerId, date: today },
          { verificationStatus: 'Matched' }
        )

        results.approved.push({ workerId, passNumber: gatePass.passNumber })
      } catch (err) {
        results.failed.push({ workerId, reason: err.message })
      }
    }

    res.json({
      message: `Approved ${results.approved.length}, Failed ${results.failed.length}`,
      results
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getDashboard, approveBatch }