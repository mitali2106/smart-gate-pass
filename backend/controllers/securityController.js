const Attendance = require('../models/Attendance')
const GatePass = require('../models/GatePass')

const getStartOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const recordEntry = async (req, res, next) => {
  try {
    const { workerId } = req.body
    const officerId = req.user.userId
    const today = getStartOfDay(new Date())

    const gatePass = await GatePass.findOne({
      workerId,
      date: today,
      status: 'Approved'
    })

    if (!gatePass) {
      return res.status(400).json({ error: 'No approved gate pass found for today. Worker must be verified at gate officer station first.' })
    }

    const existingAttendance = await Attendance.findOne({ workerId, date: today })

    if (!existingAttendance) {
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