const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, Component } = require("discord.js");
const Giveaway = require('../models/giveaway');

function parseDuration(durationStr) {
  const match = durationStr.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const [_, value, unit] = match;
  const durationMap = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return parseInt(value) * durationMap[unit];
}

function formatDuration(ms) {
  const sec = Math.floor((ms / 1000) % 60);
  const min = Math.floor((ms / 1000 / 60) % 60);
  const hrs = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ${hrs}h ${min}m`;
  if (hrs > 0) return `${hrs}h ${min}m`;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

function inMs(ms) {
  const endTimeSeconds = Math.floor((Date.now() + ms) / 1000);
  return `<t:${endTimeSeconds}:R>`;
}

async function scheduleGiveawayEnd(client, giveaway, msg) {
  try {
    // Mark giveaway as scheduled to prevent duplicate scheduling
    if (!giveaway.scheduled) {
      giveaway.scheduled = true;
      await giveaway.save();
    }

    const timeLeft = giveaway.endTime.getTime() - Date.now();

    if (timeLeft > 0) {
      // Schedule the giveaway to end
      const timeout = setTimeout(() => endGiveaway(client, giveaway, msg), timeLeft);
      
      // Store the timeout reference for cleanup
      if (!client.giveawayTimeouts) client.giveawayTimeouts = new Map();
      client.giveawayTimeouts.set(giveaway.messageId, timeout);
      
      console.log(`🎁 Scheduled giveaway ${giveaway.messageId} to end in ${formatDuration(timeLeft)}`);
    } else {
      // Giveaway should have already ended
      await endGiveaway(client, giveaway, msg);
    }
  } catch (error) {
    console.error('Error scheduling giveaway end:', error);
  }
}

async function checkActiveGiveaways(client) {
  try {
    const now = new Date();
    const giveaways = await Giveaway.find({ 
      isActive: true, 
      endTime: { $gt: now },
      scheduled: false // Only check unscheduled giveaways
    });
    
    console.log(`🎁 Found ${giveaways.length} active giveaways to resume`);
    
    for (const giveaway of giveaways) {
      try {
        const channel = client.channels.cache.get(giveaway.channelId);
        if (!channel) {
          console.log(`❌ Channel not found for giveaway ${giveaway.messageId}`);
          continue;
        }
        
        const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (!msg) {
          console.log(`❌ Message not found for giveaway ${giveaway.messageId}`);
          continue;
        }
        
        await scheduleGiveawayEnd(client, giveaway, msg);
      } catch (error) {
        console.error(`Error resuming giveaway ${giveaway.messageId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking active giveaways:', error);
  }
}

async function endGiveaway(client, giveaway, msg) {
  try {
    // Check if giveaway is already ended
    if (!giveaway.isActive) {
      console.log(`Giveaway ${giveaway.messageId} already ended`);
      return;
    }

    const message = msg || await client.channels.cache
      .get(giveaway.channelId)
      ?.messages.fetch(giveaway.messageId).catch(() => null);

    if (!message) {
      console.log(`Message not found for giveaway ${giveaway.messageId}`);
      return;
    }

    //console.log(`🎁 Ending giveaway ${giveaway.messageId} for prize: ${giveaway.prize}`);

    // Fetch all reactions to ensure we have the latest data
    try {
      await message.reactions.fetch();
      console.log(`📊 Fetched reactions for message ${giveaway.messageId}`);
      console.log(`📊 Available reactions:`, message.reactions.cache.map(r => `${r.emoji.name} (${r.emoji.id}) - ${r.count} users`));
    } catch (error) {
      console.log(`⚠️ Could not fetch reactions for message ${giveaway.messageId}:`, error.message);
    }
    
    // Try multiple ways to find the giveaway reaction
    let reaction = null;
    
    // Method 1: Direct emoji ID lookup
    reaction = message.reactions.cache.get('1426873119355703408');
    if (reaction) {
      //console.log(`✅ Found reaction by ID: ${reaction.emoji.name}`);
    }
    
    // Method 2: Find by emoji name
    if (!reaction) {
      reaction = message.reactions.cache.find(r => r.emoji.name === 'Giveaways');
      if (reaction) {
        console.log(`✅ Found reaction by name: ${reaction.emoji.name} (${reaction.emoji.id})`);
      }
    }
    
    // Method 3: Find by emoji string representation
    if (!reaction) {
      reaction = message.reactions.cache.find(r => 
        r.emoji.toString() === '<a:gift:1426625580786257952>'
      );
      if (reaction) {
        console.log(`✅ Found reaction by string: ${reaction.emoji.toString()}`);
      }
    }
    
    // Method 4: Get the first reaction (fallback)
    if (!reaction && message.reactions.cache.size > 0) {
      reaction = message.reactions.cache.first();
      console.log(`⚠️ Using first available reaction: ${reaction.emoji.name} (${reaction.emoji.id})`);
    }

    if (!reaction) {
      console.log(`❌ No giveaway reaction found for message ${giveaway.messageId}`);
      console.log(`Available reactions:`, message.reactions.cache.map(r => `${r.emoji.name} (${r.emoji.id})`));
      
      // Still end the giveaway but mark as no participants
      giveaway.isActive = false;
      giveaway.endedAt = new Date();
      giveaway.winners = [];
      await giveaway.save();

      // Clean up timeout reference
      if (client.giveawayTimeouts?.has(giveaway.messageId)) {
        clearTimeout(client.giveawayTimeouts.get(giveaway.messageId));
        client.giveawayTimeouts.delete(giveaway.messageId);
      }

      const nowinner = new EmbedBuilder()
        .setColor(process.env.color)
        .setTitle(`<a:gift:1254408217434390569> ${giveaway.prize} <a:gift:1254408217434390569>`)
        .setDescription(
          `**Winner : **\n*No entries detected therefore cannot declare the winner*` +
          `\n**Hosted By:** ${giveaway.hostedBy}`
        )
        .setTimestamp(giveaway.endedAt)
        .setFooter({ 
          text: `🎁 Ended at` 
        });

      await message.edit({
        content: `**<a:gift:1254408217434390569>GIVEAWAY ENDED!<a:gift:1254408217434390569>**`,
        embeds: [nowinner],
      });

      console.log(`🎁 Giveaway ${giveaway.messageId} ended with no participants`);
      return;
    }

    // Fetch all users who reacted
    //console.log(`📊 Fetching users for reaction: ${reaction.emoji.name} (${reaction.emoji.id})`);
    const users = await reaction.users.fetch().catch((error) => {
      console.error(`❌ Failed to fetch users for reaction:`, error.message);
      return null;
    });
    
    if (!users) {
      console.log(`❌ Failed to fetch users for reaction in giveaway ${giveaway.messageId}`);
      return;
    }

    const filtered = users.filter(u => !u.bot).map(u => u.id);
    //console.log(`✅ Found ${filtered.length} participants for giveaway ${giveaway.messageId}:`, filtered);

    const winners = [];

    for (let i = 0; i < giveaway.winnersCount && filtered.length > 0; i++) {
      const winnerIndex = Math.floor(Math.random() * filtered.length);
      winners.push(filtered[winnerIndex]);
      filtered.splice(winnerIndex, 1);
    }

    //console.log(`🎉 Selected winners:`, winners);

    // Update giveaway status
    giveaway.isActive = false;
    giveaway.endedAt = new Date();
    giveaway.winners = winners;
    await giveaway.save();

    // Clean up timeout reference
    if (client.giveawayTimeouts?.has(giveaway.messageId)) {
      clearTimeout(client.giveawayTimeouts.get(giveaway.messageId));
      client.giveawayTimeouts.delete(giveaway.messageId);
    }

    const winnerMentions = winners.length > 0 ? winners.map(id => `<@${id}>`).join(', ') : 'No valid participants';

    // Edit the original giveaway message
    const totalParticipants = users.filter(u => !u.bot).size;
    
    const endedEmbed = new EmbedBuilder()
      .setColor('#FFCC00')
      .setTitle(`<a:gift:1254408217434390569> ${giveaway.prize} <a:gift:1254408217434390569>`)
      .setDescription(
        `**Winner${winners.length === 1 ? '' : 's'}:** ${winnerMentions}\n` +
        `**Hosted By:** ${giveaway.hostedBy}\n**Total Participants: \`${totalParticipants}\`**`
      )
      .setTimestamp(giveaway.endedAt)
      .setFooter({ 
        text: `🎁 Ended at` 
      });

    const nowinner = new EmbedBuilder()
      .setColor(process.env.color)
      .setTitle(`<a:gift:1254408217434390569> ${giveaway.prize} <a:gift:1254408217434390569>`)
      .setDescription(
        `**Winner : **\n*No entries detected therefore cannot declare the winner*` +
        `\n**Hosted By:** ${giveaway.hostedBy}`
      )
      .setTimestamp(giveaway.endedAt)
      .setFooter({ 
        text: `🎁 Ended at` 
      });

    if (winners.length === 0) {
      await message.edit({
        content: `**<a:gift:1254408217434390569>GIVEAWAY ENDED!<a:gift:1254408217434390569>**`,
        embeds: [nowinner],
      });
    } else {
      await message.edit({
        content: `**<a:gift:1254408217434390569>GIVEAWAY ENDED!<a:gift:1254408217434390569>**`,
        embeds: [endedEmbed],
      });
    }

    // Send winner announcement
    if (winners.length > 0) {
      let r = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setEmoji(`<a:giveaway:1362000491424251944>`).setURL(`https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}`).setLabel(`View Giveaway`)
      );
      await message.reply({
        content: `Congratulations, ${winnerMentions}! You have won <a:gift:1254408217434390569>**${giveaway.prize}**<a:gift:1254408217434390569>, Hosted By: ${giveaway.hostedBy}`,
        components: [r]
      });
    }

    console.log(`🎁 Giveaway ${giveaway.messageId} ended successfully. Winners: ${winners.length}, Participants: ${totalParticipants}`);

  } catch (error) {
    console.error('Error ending giveaway:', error);
  }
}

module.exports = {
  scheduleGiveawayEnd,
  checkActiveGiveaways,
  endGiveaway,
  formatDuration,
  parseDuration,
  inMs,
};