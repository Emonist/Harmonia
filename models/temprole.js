const mongoose = require('mongoose');

const tempRoleSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    roleId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    expireAt: { type: Date, required: true },
    duration: { type: String, required: true }
});

module.exports = mongoose.model('TempRole', tempRoleSchema);