const { ShardingManager } = require('discord.js');
require('dotenv').config();
const logger = require('./helpers/logger');

const manager = new ShardingManager('./index.js', {
    token: process.env.TOKEN,
    totalShards: 'auto',
    respawn: true,
    mode: 'process', // Use process mode for better isolation
});

// Track shard statistics
const shardStats = {
    total: 0,
    ready: 0,
    disconnected: 0,
    reconnecting: 0,
    errors: 0,
};

// Shard creation event
manager.on('shardCreate', shard => {
    logger.info(`Shard ${shard.id} created`);
    
    // Track shard events
    shard.on('ready', () => {
        shardStats.ready++;
        logger.success(`Shard ${shard.id} is ready`);
        logShardStats();
    });
    
    shard.on('disconnect', () => {
        shardStats.disconnected++;
        logger.warning(`Shard ${shard.id} disconnected`);
        logShardStats();
    });
    
    shard.on('reconnecting', () => {
        shardStats.reconnecting++;
        logger.info(`Shard ${shard.id} is reconnecting...`);
    });
    
    shard.on('death', () => {
        shardStats.errors++;
        logger.error(`Shard ${shard.id} died`);
        logShardStats();
    });
    
    shard.on('error', error => {
        shardStats.errors++;
        logger.errorWithStack(`Shard ${shard.id} error`, error);
    });
});

// Log shard statistics
function logShardStats() {
    logger.blank();
    logger.section('Shard Statistics');
    logger.table([
        { key: 'Total Shards', value: `${shardStats.total}`, color: 'cyan' },
        { key: 'Ready', value: `${shardStats.ready}`, color: 'green' },
        { key: 'Disconnected', value: `${shardStats.disconnected}`, color: 'yellow' },
        { key: 'Reconnecting', value: `${shardStats.reconnecting}`, color: 'yellow' },
        { key: 'Errors', value: `${shardStats.errors}`, color: shardStats.errors > 0 ? 'red' : 'green' },
    ]);
    logger.blank();
}

// Spawn shards
manager.spawn()
    .then(shards => {
        shardStats.total = shards.size;
        logger.section('Sharding Manager Started');
        logger.success(`Successfully spawned ${shards.size} shard${shards.size !== 1 ? 's' : ''}`);
        logger.info(`Shard IDs: ${Array.from(shards.keys()).join(', ')}`);
        logger.blank();
        
        // Log stats after a short delay to allow shards to initialize
        setTimeout(() => {
            logShardStats();
        }, 5000);
    })
    .catch(err => {
        logger.error('Failed to spawn shards');
        logger.errorWithStack('Sharding Error', err);
        process.exit(1);
    });

// Handle process termination
process.on('SIGINT', () => {
    logger.section('Shutting Down Sharding Manager');
    logger.info('Received SIGINT, shutting down gracefully...');
    manager.shards.forEach(shard => {
        try {
            shard.kill();
            logger.success(`Shard ${shard.id} killed`);
        } catch (error) {
            logger.error(`Failed to kill shard ${shard.id}`, error);
        }
    });
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.section('Shutting Down Sharding Manager');
    logger.info('Received SIGTERM, shutting down gracefully...');
    manager.shards.forEach(shard => {
        try {
            shard.kill();
            logger.success(`Shard ${shard.id} killed`);
        } catch (error) {
            logger.error(`Failed to kill shard ${shard.id}`, error);
        }
    });
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', error => {
    logger.error('Uncaught Exception in Sharding Manager');
    logger.errorWithStack('Fatal Error', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection in Sharding Manager');
    logger.error('Reason', reason);
    logger.error('Promise', promise);
});
