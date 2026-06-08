const mongoose = require('mongoose')

const workerSchema = new mongoose.Schema({
  workerId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  photo: {
    type: String,
    required: true
  },
  faceEncoding: {
    type: [Number],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length === 128
      },
      message: 'Face encoding must have exactly 128 values'
    }
  },
  contractorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contractor',
    required: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  idProofNumber: {
    type: String,
    required: true,
    trim: true
  },
  idProofExpiry: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended', 'Blacklisted'],
    default: 'Active'
  }
}, { timestamps: true })


module.exports = mongoose.model('Worker', workerSchema)