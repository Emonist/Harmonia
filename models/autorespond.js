const mongoose = require("mongoose");

const autoRespondSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  triggerWord: {
    type: String,
    required: true,
  },
  responseMessage: {
    type: String,
    required: true,
  },
  isEmbed: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("AutoRespond", autoRespondSchema);
