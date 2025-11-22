const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  musicController: { type: String, default: null },
  musicControllerMessage: { type: String, default: null },
  prefix: { type: String, default: process.env.Prefix },
  alwaysOn: { type: Boolean, default: false },
  textChannel: { type: String, default: null },
  voiceChannel: { type: String, default: null },
  autoplay: { type: Boolean, default: false },
  previoustrack: {
      identifier: { type: String }, 
      requester: { tyoe: String }
  }, 
  ignoredChannels: {
    type: [String],
    default: [],
  },
  autoRoles: {
    humans: { type: [String], default: [] },
    bots: { type: [String], default: [] },
    all: { type: [String], default: [] },
  },
  // musicChannel: { type: String, required: true },
});

module.exports = mongoose.model('GuildSettings', guildSchema);
