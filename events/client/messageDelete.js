module.exports = {
  name: 'messageDelete',
  async execute(client, deletedMessage) {
    // Skip if message is from bot or not in guild
    if (!deletedMessage.guild || deletedMessage.author?.bot) return;
    
    // Check if database is ready
    if (!client.data) {
      console.warn('Database not ready, skipping snipe data storage');
      return;
    }
    
    try {
      const snipeData = {
        content: deletedMessage.content || 'No content available',
        id: deletedMessage.author?.id || 'Unknown Author Id',
        timestamp: deletedMessage.createdTimestamp,
        imageUrl: deletedMessage.attachments.size > 0 
          ? deletedMessage.attachments.first().url 
          : null
      };

      // Set with TTL to prevent database bloat
      await client.data.set(
        `snipe_${deletedMessage.guild.id}_${deletedMessage.channel.id}`,
        snipeData,
        3600000 // 1 hour TTL
      );
    } catch (error) {
      console.error('Error handling message deletion for snipe:', error);
    }
  },
};