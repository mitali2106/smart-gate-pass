const Attendance = require('../models/Attendance')
const GatePass = require('../models/GatePass')
const jwt = require('jsonwebtoken')

const getStartOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const recordEntry = async (req, res, next) => {
  try {
    const { workerId, qrPayload } = req.body
    const officerId = req.user.userId
    const today = getStartOfDay(new Date())

    let decoded
    try {
      decoded = jwt.verify(qrPayload, process.env.JWT_SECRET)
    } catch (err) {
      return res.status(400).json({ error: 'Invalid QR code - signature verification failed' })
    }

    if (decoded.workerId !== workerId) {
      return res.status(400).json({ error: 'QR code does not match scanned worker' })
    }

    const qrDate = getStartOfDay(new Date(decoded.date))
    if (qrDate.getTime() !== today.getTime()) {
      return res.status(400).json({ error: 'QR code has expired - wrong date' })
    }

    const gatePass = await GatePass.findOne({ workerId, date: today, status: 'Approved' })
    if (!gatePass) {
      return res.status(400).json({ error: 'No approved gate pass found for today' })
    }

    const existingAttendance = await Attendance.findOne({ workerId, date: today })

    if (!existingAttendance) {
      if (gatePass.entryUsed) {
        return res.status(400).json({ error: 'Entry already recorded for today' })
      }

      const attendance = await Attendance.create({
        workerId,
        date: today,
        entryTime: new Date(),
        entryOfficerId: officerId,
        status: 'Inside'
      })

      gatePass.entryUsed = true
      await gatePass.save()

      return res.json({ message: 'Entry recorded successfully', attendance })
    }

    if (existingAttendance.status === 'Exited') {
      return res.status(400).json({ error: 'Worker has already exited today' })
    }

    const exitTime = new Date()
    const workingHours = Math.round((exitTime - existingAttendance.entryTime) / 60000)

    existingAttendance.exitTime = exitTime
    existingAttendance.workingHours = workingHours
    existingAttendance.exitOfficerId = officerId
    existingAttendance.status = 'Exited'

    await existingAttendance.save()

    return res.json({
      message: 'Exit recorded successfully',
      attendance: existingAttendance,
      workingHours: `${workingHours} minutes`
    })
  } catch (err) {
    next(err)
  }
}

const getDashboard = async (req, res, next) => {
  try {
    const today = getStartOfDay(new Date())

    const totalApproved = await GatePass.countDocuments({ date: today, status: 'Approved' })
    const inside = await Attendance.countDocuments({ date: today, status: 'Inside' })
    const exited = await Attendance.countDocuments({ date: today, status: 'Exited' })
    const enteredToday = await Attendance.countDocuments({ date: today })

    const recentActivity = await Attendance.find({ date: today })
      .populate('workerId')
      .sort({ updatedAt: -1 })
      .limit(20)

    res.json({ totalApproved, inside, exited, enteredToday, recentActivity })
  } catch (err) {
    next(err)
  }
}

module.exports = { recordEntry, getDashboard }