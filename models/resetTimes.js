const mongoose = require('mongoose');

const resetTimesSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    unique: true // 'weekly' or 'monthly'
  },
  lastReset: {
    type: Date,
    required: true,
    default: new Date(0) // Very old date as default
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ResetTimes', resetTimesSchema);