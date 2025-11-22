const mongoose = require('mongoose');

const stickyMessageSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    message: { type: String, required: true },
    isEmbed: { type: Boolean, default: false },
    lastMessageId: { type: String, default: null },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

stickyMessageSchema.index({ guildId: 1, channelId: 1 }, { unique: true });

module.exports = mongoose.model('StickyMessage', stickyMessageSchema);