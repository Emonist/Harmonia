const { EmbedBuilder, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const WeeklyLeaderboard = require('../../models/weeklyLeaderboard');
const MonthlyLeaderboard = require('../../models/monthlyLeaderboard');

module.exports = {
  name: 'musiclbreset',
  aliases: ['resetmusiclb'],
  description: 'Reset weekly or monthly leaderboard',
  category: 'Music',
  cooldown: 10000,
  owner:true,
  async execute(client, message, args, prefix) {
    
    const type = args[0]?.toLowerCase();
    
    if (!type || (type !== 'weekly' && type !== 'monthly')) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`**${client.emoji.cross} | \`${prefix}musiclbreset <weekly/monthly>\`**`)
        ]
      });
    }
    
    // Create confirmation buttons
    const confirmButton = new ButtonBuilder()
      .setCustomId('confirm_reset')
      .setLabel('Confirm Reset')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⚠️');
      
    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel_reset')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');
      
    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
    
    // Send confirmation message
    const confirmMessage = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚠️ Leaderboard Reset Confirmation')
          .setDescription(`Are you sure you want to reset the **${type}** leaderboard?\n\nThis action **cannot be undone** and will delete all ${type} play data!`)
          .setFooter({ text: 'This action requires Administrator permissions' })
      ],
      components: [row]
    });
    
    // Create button collector
    const filter = i => i.user.id === message.author.id;
    const collector = confirmMessage.createMessageComponentCollector({ 
      filter, 
      time: 30000 // 30 seconds to respond
    });
    
    collector.on('collect', async i => {
      if (i.customId === 'confirm_reset') {
        try {
          let result;
          let leaderboardType;
          
          if (type === 'weekly') {
            result = await WeeklyLeaderboard.deleteMany({});
            leaderboardType = 'weekly';
          } else {
            result = await MonthlyLeaderboard.deleteMany({});
            leaderboardType = 'monthly';
          }
          
          // Update the message with success
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Leaderboard Reset Successfully')
                .setDescription(`**${type.toUpperCase()}** leaderboard has been reset!\n\n🗑️ **Deleted:** ${result.deletedCount} ${type} leaderboard document(s)`)
                .setFooter({ text: `Reset by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            ],
            components: []
          });
          
          console.log(`📊 ${type} leaderboard reset by ${message.author.tag} (${message.author.id}) - Deleted ${result.deletedCount} documents`);
          
        } catch (error) {
          console.error('Error resetting leaderboard:', error);
          await i.update({
            embeds: [
              new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Reset Failed')
                .setDescription('An error occurred while resetting the leaderboard.')
            ],
            components: []
          });
        }
      } else if (i.customId === 'cancel_reset') {
        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor('#808080')
              .setTitle('🚫 Reset Cancelled')
              .setDescription(`${type.toUpperCase()} leaderboard reset has been cancelled.`)
          ],
          components: []
        });
      }
    });
    
    collector.on('end', collected => {
      if (collected.size === 0) {
        confirmMessage.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('#808080')
              .setTitle('⏰ Timeout')
              .setDescription('Reset confirmation timed out after 30 seconds.')
          ],
          components: []
        }).catch(() => {});
      }
    });
  }
};