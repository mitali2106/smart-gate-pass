const mongoose = require('mongoose')

const gatePassSchema = new mongoose.Schema({
  passNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Approved', 'Rejected', 'Pending'],
    default: 'Pending'
  },
  qrPayload: {
    type: String,
    required: true
  },
  entryUsed: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  overrideReason: {
    type: String,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true })


module.exports = mongoose.model('GatePass', gatePassSchema)