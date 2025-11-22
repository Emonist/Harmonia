const mongoose = require('mongoose');

const noPrefixSchema = new mongoose.Schema({
  userId: { type: String, required: true },

  expiresAt: { type: Date, default: null },
});

module.exports = mongoose.model('NoPrefix', noPrefixSchema);
