const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true },
    authorId: { type: String, required: true },
    question: { type: String, required: true },
    startTime: { type: String, required: true },
    endTimestamp: { type: Number, required: true }, // Store end time as UNIX timestamp
    active: { type: Boolean, default: true },
    votes: {
        up: [{ type: String }],
        down: [{ type: String }]
    }
});

module.exports = mongoose.model('Poll', pollSchema);