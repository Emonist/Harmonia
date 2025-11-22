const mongoose = require("mongoose");

const roleEmojiSchema = new mongoose.Schema({
  roleId: { type: String, required: true },
  emoji: { type: String, required: true }
}, { _id: false });

const reactionRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true },
  panelName: { type: String, required: true, unique: true },
  roles: {
    type: [roleEmojiSchema],
    validate: {
      validator: function (value) {
        const emojis = value.map(v => v.emoji);
        return new Set(emojis).size === emojis.length;
      },
      message: "All emojis must be unique within the reaction roles for a message."
    }
  },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ReactionRole", reactionRoleSchema);