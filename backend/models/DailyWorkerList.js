const mongoose = require('mongoose')

const editHistorySchema = new mongoose.Schema({
  editedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    required: true
  },
  prevWorkers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  }]
}, { _id: false })

const dailyWorkerListSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  contractorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contractor',
    required: true
  },
  workers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  },
  editHistory: [editHistorySchema],
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Recalled'],
    default: 'Pending'
  }
}, { timestamps: true })

dailyWorkerListSchema.index({ date: 1, contractorId: 1 })

module.exports = mongoose.model('DailyWorkerList', dailyWorkerListSchema)