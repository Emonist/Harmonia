const mongoose = require('mongoose');

const AutoReactSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  trigger: { type: String, required: true, lowercase: true },
  emoji: { type: String, required: true },
}, {
  timestamps: true
});

module.exports = mongoose.model('AutoReact', AutoReactSchema);