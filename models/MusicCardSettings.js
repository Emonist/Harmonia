const { Schema, model } = require('mongoose');

const MusicCardSettingsSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  cardStyle: { 
    type: String, 
    enum: ['large', 'small'], 
    default: 'large' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = model('MusicCardSettings', MusicCardSettingsSchema);