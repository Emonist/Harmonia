require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Options } = require('discord.js');
const { EventEmitter } = require('events');
const { connectMongo, disconnectMongo } = require('./structures/mongo');
const { dbManager } = require('./structures/quickmongo');
const setupLavalink = require('./structures/lavalink');
const loadCommands = require('./handlers/commandHandler');
const loadEvents = require('./handlers/eventHandler');
const voteCheck = require('./structures/voteCheck');
const PollManager = require('./handlers/pollmanager');
const MemoryMonitor = require('./structures/memoryMonitor');
const TopGGManager = require('./structures/topgg');
const logger = require('./helpers/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions, 
    GatewayIntentBits.GuildPresences
  ],
  rest: {
    timeout: 60000,
    retries: 3
  },
  makeCache: Options.cacheWithLimits({
    MessageManager: 50, 
    UserManager: 200,
    GuildMemberManager: 100,
    ReactionManager: 100, 
    ReactionUserManager: 50, 
    PresenceManager: 0, 
    VoiceStateManager: 100,
    ThreadManager: 0,
    ThreadMemberManager: 0,
    StageInstanceManager: 0,
    GuildScheduledEventManager: 0,
    AutoModerationRuleManager: 0,
    ApplicationCommandManager: 0,
    BaseGuildEmojiManager: 0,
    GuildEmojiManager: 0,
    GuildStickerManager: 0,
    GuildInviteManager: 0,
    GuildBanManager: 0
  }),
  sweepers: {
    messages: {
      interval: 300, 
      lifetime: 1800, 
    },
    users: {
      interval: 3600, 
      filter: () => user => user.bot && user.id !== client.user.id,
    },
    guildMembers: {
      interval: 3600, 
      filter: () => member => member.user.bot && member.user.id !== client.user.id,
    },
    reactions: {
      interval: 600, 
      filter: () => reaction => {
        const giveawayMessageIds = client.giveawayTimeouts ? Array.from(client.giveawayTimeouts.keys()) : [];
        return !giveawayMessageIds.includes(reaction.message.id);
      },
    },
    presences: {
      interval: 300, 
      filter: () => () => true, 
    }
  }
});
client.voteCheck = voteCheck;
client.commands = new Collection();
client.slashCommands = new Collection();
client.prefix = process.env.Prefix;
// client.data will be set after database connection

// Initialize TopGG Manager
client.topgg = new TopGGManager(client);

// Initialize memory management collections
client.prefixes = new Map();
client.spamTracker = new Map();
client.activeIntervals = new Set();
client.activeTimeouts = new Set();

// Memory cleanup utilities
client.cleanupMemory = () => {
  // Clear spam tracker periodically
  if (client.spamTracker.size > 1000) {
    const now = Date.now();
    for (const [key, data] of client.spamTracker.entries()) {
      if (now - data.lastTime > 300000) { // 5 minutes
        client.spamTracker.delete(key);
      }
    }
  }
  
  // Clear prefix cache if too large
  if (client.prefixes.size > 500) {
    client.prefixes.clear();
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
};

// Set up memory cleanup interval
const memoryCleanupInterval = setInterval(client.cleanupMemory, 300000); // 5 minutes
client.activeIntervals.add(memoryCleanupInterval);

client.emoji = require('./emoji.json');

// These will be initialized after database connection
let pollManager;
let memoryMonitor;

// Enhanced shutdown handling
const gracefulShutdown = async (signal) => {
  logger.section(`Shutting Down (${signal})`);
  
  try {
    // Stop poll manager
    if (pollManager) {
      await pollManager.stop();
      logger.success('Poll manager stopped');
    }
    
    // Stop memory monitor
    if (memoryMonitor) {
      memoryMonitor.stop();
      logger.success('Memory monitor stopped');
    }
    
    // Clear all intervals and timeouts
    const intervalCount = client.activeIntervals.size;
    const timeoutCount = client.activeTimeouts.size;
    client.activeIntervals.forEach(interval => clearInterval(interval));
    client.activeTimeouts.forEach(timeout => clearTimeout(timeout));
    logger.info(`Cleared ${intervalCount} intervals and ${timeoutCount} timeouts`);
    
    // Clear giveaway timeouts
    if (client.giveawayTimeouts) {
      const giveawayCount = client.giveawayTimeouts.size;
      client.giveawayTimeouts.forEach(timeout => clearTimeout(timeout));
      client.giveawayTimeouts.clear();
      logger.success(`Cleared ${giveawayCount} giveaway timeouts`);
    }
    
    // Destroy all music players
    if (client.poru?.players) {
      const playerCount = client.poru.players.size;
      client.poru.players.forEach(player => {
        try {
          player.destroy();
        } catch (err) {
          logger.error('Error destroying player', err);
        }
      });
      logger.success(`Destroyed ${playerCount} music players`);
    }
    
    // Close database connections
    await dbManager.disconnect();
    logger.success('QuickMongo disconnected');
    await disconnectMongo();
    logger.success('MongoDB disconnected');
    
    // Destroy Discord client
    client.destroy();
    logger.success('Discord client destroyed');
    
    logger.section('Shutdown Complete');
    process.exit(0);
  } catch (error) {
    logger.errorWithStack('Error during shutdown', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

// Initialize the bot
async function initializeBot() {
  try {
    await connectMongo();
    await dbManager.connect();
    
    client.data = dbManager.database;
    
    pollManager = new PollManager(client);
    memoryMonitor = new MemoryMonitor(client);
    
    setupLavalink(client);
    loadCommands(client);
    loadEvents(client);
    
    await client.login(process.env.TOKEN);
    
    await pollManager.start();
    logger.success('Poll manager started');
    
    memoryMonitor.start();
    logger.success('Memory monitor started');
    
    logger.section('Bot Initialized Successfully');
  } catch (error) {
    logger.errorWithStack('Failed to initialize bot', error);
    process.exit(1);
  }
}

initializeBot();
module.exports = client;


process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled Promise Rejection');
  logger.error('Reason', reason);
  if (reason?.status) logger.error('HTTP Status', reason.status);
  
  // Log to error webhook
  try {
    const { logError } = require('./helpers/webhookLogger');
    await logError(client, {
      error: reason instanceof Error ? reason : new Error(String(reason)),
      context: 'Unhandled Promise Rejection',
      additionalInfo: {
        promise: '<unknown>',
        status: reason?.status,
      },
    });
  } catch (err) {
    logger.error('Failed to log unhandled rejection to webhook', err);
  }
});

process.on('uncaughtException', async (err) => {
  logger.error('Uncaught Exception');
  logger.errorWithStack('Fatal Error', err);
  
  // Log to error webhook
  try {
    const { logError } = require('./helpers/webhookLogger');
    await logError(client, {
      error: err,
      context: 'Uncaught Exception',
      additionalInfo: {
        fatal: true,
      },
    });
  } catch (logErr) {
    logger.error('Failed to log uncaught exception to webhook', logErr);
  }
  
  // Optional: Gracefully shutdown
  // process.exit(1);
});

process.on('uncaughtExceptionMonitor', async (err) => {
  logger.warning('Uncaught Exception Monitor');
  logger.errorWithStack('Exception Detected', err);
  
  // Log to error webhook
  try {
    const { logError } = require('./helpers/webhookLogger');
    await logError(client, {
      error: err,
      context: 'Uncaught Exception Monitor',
    });
  } catch (logErr) {
    logger.error('Failed to log exception monitor to webhook', logErr);
  }
});

client.rest.removeAllListeners('rateLimited');
client.rest.setMaxListeners(5); // Limit listeners
client.rest.on('rateLimited', async (info) => {
  logger.warning('Discord Rate Limited');
  logger.table([
    { key: 'Timeout', value: `${info.timeout}ms`, color: 'yellow' },
    { key: 'Method', value: info.method, color: 'yellow' },
    { key: 'Global', value: info.global ? 'Yes' : 'No', color: info.global ? 'red' : 'yellow' },
  ]);
  
  if (info.global) {
    logger.error('Global rate limit hit. Pausing requests.');
    const timeout = setTimeout(() => {
      logger.success('Global rate limit cleared. Resuming requests.');
    }, info.timeout);
    client.activeTimeouts.add(timeout);
  }
});

const wsErrorHandler = (err) => {
  logger.error('WebSocket Error', err.message || err);
};

const wsReadyHandler = () => {
  logger.success('WebSocket Connection Ready');
};

client.ws.removeAllListeners('error');
client.ws.removeAllListeners('ready');
client.ws.setMaxListeners(5); // Limit listeners
client.ws.on('error', wsErrorHandler);
client.ws.on('ready', wsReadyHandler);

EventEmitter.defaultMaxListeners = 15; // Reduced from 25
client.setMaxListeners(15);
logger.info(`EventEmitter max listeners set to ${EventEmitter.defaultMaxListeners}`);