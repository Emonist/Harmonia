const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
  messageId: String,
  guildId: String,
  channelId: String,
  endTime: { type: Date, required: true }, // Changed to Date type
  winnersCount: Number,
  prize: String,
  hostedBy: String,
  isActive: { type: Boolean, default: true },
  endedAt: { type: Date, default: null }, // Changed to Date type
  winners: { type: [String], default: [] },
  scheduled: { type: Boolean, default: false }, // Track if giveaway is scheduled to end
});

module.exports = mongoose.model('Giveaway', giveawaySchema);
