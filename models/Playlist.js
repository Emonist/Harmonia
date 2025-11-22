const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  songs: [
    {
      title: String,
      url: String,
    },
  ],
});

module.exports = mongoose.model('Playlist', PlaylistSchema);
