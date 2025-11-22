const mongoose = require('mongoose');

const vcRoleSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    index: true,
  },
  roleId: {
    type: String,
    required: true,
  },
}, { timestamps: true });

vcRoleSchema.index({ guildId: 1, roleId: 1 }, { unique: true });

vcRoleSchema.statics.getGuildRoles = async function (guildId) {
  return this.find({ guildId });
};

vcRoleSchema.statics.clearGuildRoles = async function (guildId) {
  return this.deleteMany({ guildId });
};

module.exports = mongoose.model('VcRole', vcRoleSchema);
