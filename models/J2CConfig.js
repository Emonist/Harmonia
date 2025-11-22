const mongoose = require('mongoose');

const j2cConfigSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  categoryId: {
    type: String,
    required: true,
  },
  voiceChannelId: {
    type: String,
    required: true,
  },
  controlChannelId: {
    type: String,
    required: true,
  },
  templateChannelId: {
    type: String,
    required: false,
  },
}, { timestamps: true });

j2cConfigSchema.statics.getGuildConfig = async function (guildId) {
  return this.findOne({ guildId });
};

j2cConfigSchema.statics.deleteGuildConfig = async function (guildId) {
  return this.deleteOne({ guildId });
};

module.exports = mongoose.model('J2CConfig', j2cConfigSchema);