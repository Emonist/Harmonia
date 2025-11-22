const { Schema, model } = require('mongoose');

const MusicSetupSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  musicChannel: { type: String, required: true },
});

module.exports = model('MusicSetup', MusicSetupSchema);
