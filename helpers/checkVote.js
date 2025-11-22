const { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { fastVoteCheck } = require('./voteCheckHelper');
const Premium = require('../models/premium');

/**
 * Check if user has voted and show vote message if not
 * @param {Object} client - Discord client
 * @param {Object} message - Discord message
 * @returns {Promise<boolean>} - Returns true if user has voted, is premium, or is owner, false otherwise
 */
async function checkVote(client, message) {
  try {
    // Bot owner bypass
    if (message.author.id === process.env.BOT_OWNER) {
      return true;
    }

    // Check premium status first (fast check, no delay)
    try {
      const premiumEntry = await Premium.findOne({ userId: message.author.id }).lean();
      const isPremium = premiumEntry && (!premiumEntry.expiresAt || premiumEntry.expiresAt > new Date());
      if (isPremium) {
        return true; // Premium users bypass vote requirement
      }
    } catch (err) {
      // Continue to vote check if premium check fails
    }

    // Check vote status
    const hasVoted = await fastVoteCheck(message.author.id);
    
    if (!hasVoted) {
      const voteContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(
              `## ⚠️ Vote Required\n\n` +
              `This command requires you to **vote** for the bot on Top.gg!\n\n` +
              `**Why vote?**\n` +
              `• Unlock premium commands\n` +
              `• Support the bot's development\n` +
              `• Get access to exclusive features\n\n` +
              `**Want instant access with no delays?**\n` +
              `• Buy **Premium** at our support server\n` +
              `• Premium users bypass all vote requirements\n` +
              `• Get exclusive perks and priority support\n\n` +
              `**Vote now or get premium to continue!**`
            )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('Vote on Top.gg')
              .setStyle(ButtonStyle.Link)
              .setURL('https://top.gg/bot/1409051024936669184/vote')
              .setEmoji('<a:vote:1426484295702151258>'),
            new ButtonBuilder()
              .setLabel('Get Premium')
              .setStyle(ButtonStyle.Link)
              .setURL('https://discord.gg/devhaven')
              .setEmoji('💎'),
            new ButtonBuilder()
              .setLabel('Check Vote Status')
              .setStyle(ButtonStyle.Link)
              .setURL('https://top.gg/bot/1409051024936669184')
              .setEmoji('<a:Search:1426500177551953951>')
          )
        );

      await message.reply({
        components: [voteContainer],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
      });

      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking vote:', error);
    // On error, allow the command (fail-safe)
    return true;
  }
}

module.exports = { checkVote };

