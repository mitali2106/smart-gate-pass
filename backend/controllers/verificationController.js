const VerificationRecord = require('../models/VerificationRecord')
const Worker = require('../models/Worker')
const DailyWorkerList = require('../models/DailyWorkerList')
const GatePass = require('../models/GatePass')
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

const run5PointCheck = async (workerId, confidence, date) => {
  const worker = await Worker.findById(workerId)
  if (!worker) return { pass: false, failureCode: 'FACE_MISMATCH' }

  if (confidence < 60) return { pass: false, failureCode: 'FACE_MISMATCH' }

  const today = getStartOfDay(date)

  const list = await DailyWorkerList.findOne({
    date: today,
    workers: workerId,
    status: 'Approved'
  })
  if (!list) return { pass: false, failureCode: 'NOT_IN_LIST' }

  if (list.status === 'Recalled') return { pass: false, failureCode: 'LIST_RECALLED' }

  const duplicate = await VerificationRecord.findOne({
    workerId,
    date: today,
    verificationStatus: 'Matched'
  })
  if (duplicate) return { pass: false, failureCode: 'DUPLICATE' }

  if (worker.status !== 'Active') return { pass: false, failureCode: 'BLACKLISTED' }

  if (new Date(worker.idProofExpiry) < new Date()) return { pass: false, failureCode: 'DOC_EXPIRED' }

  return { pass: true }
}

const submitScan = async (req, res, next) => {
  try {
    const { workerId, confidence, livenessPass } = req.body
    const officerId = req.user.userId
    const today = getStartOfDay(new Date())

    const checkResult = await run5PointCheck(workerId, confidence, new Date())

    let verificationStatus
    let gatePass = null

    if (!livenessPass) {
      verificationStatus = 'Rejected'
    } else if (checkResult.pass) {
      verificationStatus = 'Matched'

      const existingPass = await GatePass.findOne({ workerId, date: today })
      if (!existingPass) {
        const passNumber = generatePassNumber()
        const expiresAt = new Date(today)
        expiresAt.setHours(23, 59, 59, 999)

        const qrPayload = jwt.sign(
          { passNumber, workerId: workerId.toString(), date: today.toISOString() },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        )

        gatePass = await GatePass.create({
          passNumber,
          workerId,
          date: today,
          status: 'Approved',
          qrPayload,
          entryUsed: false,
          approvedBy: officerId,
          expiresAt
        })
      }
    } else if (checkResult.failureCode === 'FACE_MISMATCH') {
      verificationStatus = 'NeedsReview'
    } else {
      verificationStatus = 'Rejected'
    }

    const record = await VerificationRecord.findOneAndUpdate(
      { workerId, date: today },
      {
        workerId,
        date: today,
        officerId,
        confidence,
        livenessPass,
        failureCode: checkResult.pass ? null : checkResult.failureCode,
        verificationStatus,
        expireAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      },
      { upsert: true, new: true }
    )

    res.status(201).json({
      message: 'Scan recorded',
      verificationStatus,
      failureCode: checkResult.failureCode || null,
      gatePass,
      record
    })
  } catch (err) {
    next(err)
  }
}

const getPendingVerifications = async (req, res, next) => {
  try {
    const today = getStartOfDay(new Date())
    const pending = await VerificationRecord.find({
      date: today,
      verificationStatus: 'NeedsReview'
    }).populate('workerId')

    res.json({ pending })
  } catch (err) {
    next(err)
  }
}

module.exports = { submitScan, getPendingVerifications }