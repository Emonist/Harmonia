const mongoose = require('mongoose');

const premiumSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  grantedBy: {
    type: String,
    required: true,
  },
  grantedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Premium', premiumSchema);
