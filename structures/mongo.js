const mongoose = require('mongoose');
const color = require("colors");

async function connectMongo() {
  try {
    // Prevent multiple connections
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }

    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      // Removed bufferMaxEntries and bufferCommands as they cause issues
    });

    console.log(color.bold.magenta('╔' + '═'.repeat(50) + '╗'));
    console.log(color.bold.magenta('║') + color.bold.white('   🚀  MongoDB linked up and running smoothly!     ') + color.bold.magenta('║'));
    console.log(color.bold.magenta('╚' + '═'.repeat(50) + '╝'));

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Graceful shutdown function
async function disconnectMongo() {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
}

module.exports = { connectMongo, disconnectMongo };
