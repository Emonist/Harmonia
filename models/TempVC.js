const mongoose = require('mongoose');

const tempVCSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    index: true,
  },
  channelId: {
    type: String,
    required: true,
    unique: true,
  },
  ownerId: {
    type: String,
    required: true,
  },
  creatorId: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

tempVCSchema.index({ guildId: 1, ownerId: 1 });
tempVCSchema.index({ guildId: 1, creatorId: 1 });

tempVCSchema.statics.getUserChannels = async function (guildId, userId) {
  return this.find({ guildId, ownerId: userId });
};

tempVCSchema.statics.getChannel = async function (channelId) {
  return this.findOne({ channelId });
};

tempVCSchema.statics.deleteChannel = async function (channelId) {
  return this.deleteOne({ channelId });
};

tempVCSchema.statics.transferOwnership = async function (channelId, newOwnerId) {
  return this.findOneAndUpdate(
    { channelId },
    { ownerId: newOwnerId },
    { new: true }
  );
};

module.exports = mongoose.model('TempVC', tempVCSchema);