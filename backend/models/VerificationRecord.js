const mongoose = require('mongoose')

const verificationRecordSchema = new mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  officerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100
  },
  livenessPass: {
    type: Boolean,
    default: false
  },
  failureCode: {
    type: String,
    enum: ['FACE_MISMATCH', 'NOT_IN_LIST', 'DUPLICATE', 'BLACKLISTED', 'DOC_EXPIRED', 'LIST_RECALLED', null],
    default: null
  },
  verificationStatus: {
    type: String,
    enum: ['Matched', 'NeedsReview', 'Rejected'],
    required: true
  },
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  }
}, { timestamps: true })

verificationRecordSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })
verificationRecordSchema.index({ workerId: 1, date: 1 }, { unique: true })

module.exports = mongoose.model('VerificationRecord', verificationRecordSchema)