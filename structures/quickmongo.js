const { Database } = require("quickmongo");
const color = require("colors");

class DatabaseManager {
  constructor() {
    this.database = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected && this.database) {
        console.log('QuickMongo already connected');
        return;
      }

      this.database = new Database(process.env.MONGO_URI);

      await this.database.connect();
      this.isConnected = true;

      console.log(color.bold.cyan(`
╭──────────────────────────────────────────────────────────────╮
│  QuickMongo connected successfully. Ready to handle data! ⚡  │
╰──────────────────────────────────────────────────────────────╯
        `));

      // Handle connection events
      this.database.on('error', (err) => {
        console.error('QuickMongo error:', err);
        this.isConnected = false;
      });

      this.database.on('disconnect', () => {
        console.warn('QuickMongo disconnected');
        this.isConnected = false;
      });
        
    } catch (error) {
      console.error('❌ QuickMongo Connection Error:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.database && this.isConnected) {
        await this.database.close();
        this.isConnected = false;
        console.log('QuickMongo connection closed');
      }
    } catch (error) {
      console.error('Error closing QuickMongo connection:', error);
    }
  }
}

const dbManager = new DatabaseManager();
module.exports = { dbManager };