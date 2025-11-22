const mongoose = require('mongoose');

const weeklyLeaderboardSchema = new mongoose.Schema({
  period: {
    type: String,
    required: true,
    unique: true // Only one document per period
  },
  tracks: [{
    title: String,
    author: String,
    plays: {
      type: Number,
      default: 1
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('WeeklyLeaderboard', weeklyLeaderboardSchema);