const { Api } = require('@top-gg/sdk');

class TopGGManager {
  constructor(client) {
    this.client = client;
    this.topgg = process.env.TOPGG_TOKEN ? new Api(process.env.TOPGG_TOKEN) : null;
    
    if (!process.env.TOPGG_TOKEN) {
      console.warn('TOPGG_TOKEN not found in environment variables. Top.gg integration will be disabled.');
    }
  }

  /**
   * Post server count to Top.gg
   * @param {number} serverCount - Number of servers the bot is in
   * @returns {Promise<void>}
   */
  async postStats(serverCount) {
    if (!this.topgg) return;
    
    try {
      await this.topgg.postStats({
        serverCount: serverCount,
        shardCount: this.client.shard?.count || 1,
        shardId: this.client.shard?.ids?.[0] || 0
      });
      console.log(`📈 Successfully posted server count (${serverCount}) to Top.gg`);
    } catch (error) {
      console.error('❌ Error posting stats to Top.gg:', error);
    }
  }

  /**
   * Get bot stats from Top.gg
   * @returns {Promise<Object|null>}
   */
  async getStats() {
    if (!this.topgg) return null;
    
    try {
      const stats = await this.topgg.getBotStats(this.client.user.id);
      return stats;
    } catch (error) {
      console.error('❌ Error getting stats from Top.gg:', error);
      return null;
    }
  }
}

module.exports = TopGGManager;