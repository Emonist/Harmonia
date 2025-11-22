const mongoose = require('mongoose');

const tempBanSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, default: 'No reason provided' },
    expireAt: { type: Date, required: true },
    duration: { type: String, required: true }
});

module.exports = mongoose.model('TempBan', tempBanSchema);