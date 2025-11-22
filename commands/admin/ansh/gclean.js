const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const Giveaway = require('../../models/giveaway');

// Cleanup function
async function cleanupEndedGiveaways() {
  try {
    const now = new Date();
    
    // Find giveaways that should have ended but have endedAt as null
    const expiredGiveaways = await Giveaway.find({
      isActive: true,
      endedAt: null
    });

    console.log(`🧹 Found ${expiredGiveaways.length} giveaways to check for cleanup`);

    let toDelete = [];
    
    // Check each giveaway to see if it should have ended
    for (const giveaway of expiredGiveaways) {
      const timeLeft = new Date(giveaway.endTime).getTime() - now.getTime();
      const isOverdue = timeLeft <= 0;
      
      if (isOverdue) {
        toDelete.push(giveaway._id);
      }
    }

    console.log(`🧹 Found ${toDelete.length} expired giveaways to cleanup`);

    if (toDelete.length > 0) {
      // Delete them from database
      const result = await Giveaway.deleteMany({
        _id: { $in: toDelete }
      });

      console.log(`✅ Cleaned up ${result.deletedCount} expired giveaways from database`);
    }

    return toDelete.length;
  } catch (error) {
    console.error('❌ Error cleaning up giveaways:', error);
    return 0;
  }
}

// Discord command
module.exports = {
  name: 'gcleanup',
  description: 'Clean up expired giveaways from database',
  cooldown: 10000,
  owner:true,
  async execute(client, message, args, prefix) {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const noPermissionEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('🚫 Permission Denied')
          .setDescription('You need `Administrator` permission to use this command.');
        return message.reply({ embeds: [noPermissionEmbed] });
      }

      // Show loading message
      const loadingEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🧹 Cleaning up...')
        .setDescription('Checking for expired giveaways to remove from database.')
        .setTimestamp();

      const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

      // Run cleanup
      const cleanedCount = await cleanupEndedGiveaways();

      // Show results
      const resultEmbed = new EmbedBuilder()
        .setColor(cleanedCount > 0 ? '#00FF00' : '#FFFF00')
        .setTitle(cleanedCount > 0 ? '✅ Cleanup Complete' : 'ℹ️ No Cleanup Needed')
        .setDescription(cleanedCount > 0 
          ? `Successfully removed ${cleanedCount} expired giveaway(s) from the database.`
          : 'No expired giveaways found in the database.'
        )
        .setFooter({ text: 'This process runs automatically every hour.' })
        .setTimestamp();

      await loadingMsg.edit({ embeds: [resultEmbed] });

    } catch (error) {
      console.error('Error in gcleanup:', error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('An error occurred during cleanup.');
      await message.reply({ embeds: [errorEmbed] });
    }
  },
};

// Export the cleanup function for use in other files
module.exports.cleanupEndedGiveaways = cleanupEndedGiveaways;