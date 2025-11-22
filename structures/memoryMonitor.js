const color = require("colors");

class MemoryMonitor {
  constructor(client) {
    this.client = client;
    this.monitorInterval = null;
    this.lastMemoryUsage = 0;
    this.memoryThreshold = 500 * 1024 * 1024; // 500MB threshold
  }

  start() {
    if (this.monitorInterval) return;

    this.monitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 300000); // Check every 5 minutes

    // Track interval for cleanup
    if (this.client.activeIntervals) {
      this.client.activeIntervals.add(this.monitorInterval);
    }

    console.log(color.bold.green('🔍 Memory monitor started'));
  }

  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      
      if (this.client.activeIntervals) {
        this.client.activeIntervals.delete(this.monitorInterval);
      }
      
      this.monitorInterval = null;
      console.log(color.bold.yellow('🔍 Memory monitor stopped'));
    }
  }

  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const externalMB = Math.round(memUsage.external / 1024 / 1024);

    // Log memory usage
    console.log(color.bold.cyan(`📊 Memory Usage: ${usedMB}MB / ${totalMB}MB (External: ${externalMB}MB)`));

    // Check for memory leaks
    if (memUsage.heapUsed > this.memoryThreshold) {
      console.warn(color.bold.red(`⚠️ High memory usage detected: ${usedMB}MB`));
      this.performCleanup();
    }

    // Check for rapid memory growth
    if (this.lastMemoryUsage > 0) {
      const growth = memUsage.heapUsed - this.lastMemoryUsage;
      const growthMB = Math.round(growth / 1024 / 1024);
      
      if (growthMB > 50) { // More than 50MB growth in 5 minutes
        console.warn(color.bold.yellow(`⚠️ Rapid memory growth detected: +${growthMB}MB`));
        this.performCleanup();
      }
    }

    this.lastMemoryUsage = memUsage.heapUsed;

    // Log cache sizes
    this.logCacheSizes();
  }

  performCleanup() {
    console.log(color.bold.yellow('🧹 Performing memory cleanup...'));
    
    try {
      // Clean up client caches
      if (this.client.cleanupMemory) {
        this.client.cleanupMemory();
      }

      // Clean up Discord.js caches
      this.cleanupDiscordCaches();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log(color.bold.green('✅ Garbage collection triggered'));
      }

      // Log memory after cleanup
      const afterCleanup = process.memoryUsage();
      const afterMB = Math.round(afterCleanup.heapUsed / 1024 / 1024);
      console.log(color.bold.green(`✅ Memory after cleanup: ${afterMB}MB`));
      
    } catch (error) {
      console.error('Error during memory cleanup:', error);
    }
  }

  cleanupDiscordCaches() {
    try {
      // Clean up old messages from cache
      this.client.guilds.cache.forEach(guild => {
        guild.channels.cache.forEach(channel => {
          if (channel.messages) {
            const messages = channel.messages.cache;
            if (messages.size > 50) {
              const toDelete = messages.size - 50;
              const oldMessages = messages.first(toDelete);
              oldMessages.forEach(msg => messages.delete(msg.id));
            }
          }
        });
      });

      // Clean up user cache (keep only recent users)
      if (this.client.users.cache.size > 1000) {
        const users = Array.from(this.client.users.cache.values());
        const toRemove = users.slice(500); // Keep only 500 most recent
        toRemove.forEach(user => {
          if (user.id !== this.client.user.id) {
            this.client.users.cache.delete(user.id);
          }
        });
      }

      console.log(color.bold.green('✅ Discord caches cleaned'));
    } catch (error) {
      console.error('Error cleaning Discord caches:', error);
    }
  }

  logCacheSizes() {
    const guilds = this.client.guilds.cache.size;
    const users = this.client.users.cache.size;
    const channels = this.client.channels.cache.size;
    
    let totalMessages = 0;
    this.client.channels.cache.forEach(channel => {
      if (channel.messages) {
        totalMessages += channel.messages.cache.size;
      }
    });

    console.log(color.bold.blue(`📈 Cache Sizes - Guilds: ${guilds}, Users: ${users}, Channels: ${channels}, Messages: ${totalMessages}`));
  }

  getMemoryStats() {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024)
    };
  }
}

module.exports = MemoryMonitor;