const mongoose = require('mongoose')

const attendanceSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  entryTime: {
    type: Date,
    default: null
  },
  exitTime: {
    type: Date,
    default: null
  },
  workingHours: {
    type: Number,
    default: null
  },
  entryOfficerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  exitOfficerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['Inside', 'Exited'],
    default: 'Inside'
  }
}, { timestamps: true })

attendanceSchema.index({ workerId: 1, date: 1 })

module.exports = mongoose.model('Attendance', attendanceSchema)