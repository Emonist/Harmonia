const mongoose = require('mongoose');

const VanityConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  vanities: [
    {
      vanity: { type: String, required: true },
      role: { type: String, required: true }
    }
  ]
});

module.exports = mongoose.model('VanityConfig', VanityConfigSchema);