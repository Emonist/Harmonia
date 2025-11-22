
const mongoose = require('mongoose');

const welcomeSettingsSchema = new mongoose.Schema({
  guildID: { type: String, required: true, unique: true },
  
  autodel: { type: Number },
  channelIDN: { type: Array },
  nmessage: { type: Boolean, default: false },
  nmsg: { type: String, default: null },


  message: { type: String, required: false, default: '' }, // Ensure message has a default value
  channelId: { type: String, default: null },
  embed: { type: Boolean, default: false },
  embedOptions: {
    color: { type: String, default: "#ee08e8" },
    author: { type: String, default: null },
    authorAvatar: { type: String, default: null },
    title: { type: String, default: null },
    url: { type: String, default: null },
    thumbnail: { type: String, default: null },
    description: { type: String, default: null },
    image: { type: String, default: null },
    footer: { type: String, default: null },
    footerAvatar: { type: String, default: null },
  },
  emautodel: { type: Number },
  autoroleHumans: { type: [String], default: [] },
  autoroleBots: { type: [String], default: [] }
});

module.exports = mongoose.model('WelcomeSettings', welcomeSettingsSchema);
