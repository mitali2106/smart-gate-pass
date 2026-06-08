const VerificationRecord = require('../models/VerificationRecord')
const Worker = require('../models/Worker')
const DailyWorkerList = require('../models/DailyWorkerList')

const getStartOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const run5PointCheck = async (workerId, confidence, date) => {
  const worker = await Worker.findById(workerId)
  if (!worker) return { pass: false, failureCode: 'FACE_MISMATCH' }

  if (confidence < 85) return { pass: false, failureCode: 'FACE_MISMATCH' }

  const today = getStartOfDay(date)
  const list = await DailyWorkerList.findOne({
    date: today,
    workers: workerId
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
    if (!livenessPass) {
      verificationStatus = 'Rejected'
    } else if (checkResult.pass) {
      verificationStatus = 'Matched'
    } else if (checkResult.failureCode === 'FACE_MISMATCH') {
      verificationStatus = 'NeedsReview'
    } else {
      verificationStatus = 'Rejected'
    }

    const record = await VerificationRecord.create({
      workerId,
      date: today,
      officerId,
      confidence,
      livenessPass,
      failureCode: checkResult.pass ? null : checkResult.failureCode,
      verificationStatus,
      expireAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    })

    res.status(201).json({
      message: 'Scan recorded',
      verificationStatus,
      failureCode: checkResult.failureCode || null,
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