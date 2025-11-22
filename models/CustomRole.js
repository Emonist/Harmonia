const mongoose = require('mongoose');

const customRoleSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    trigger: { type: String, required: true },
    roleId: { type: String, required: true },
    managerRoleId: { type: String, default: null }
});

module.exports = mongoose.model('CustomRole', customRoleSchema);