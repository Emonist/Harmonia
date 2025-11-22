const J2CConfig = require('../../models/J2CConfig');
const TempVC = require('../../models/TempVC');
const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(client, oldState, newState) {
    try {
      const member = newState.member || oldState.member;
      if (!member || !member.guild) return;

      const guild = member.guild;
      
      // Get J2C configuration for this guild
      const config = await J2CConfig.getGuildConfig(guild.id);
      if (!config) return;

      // Check if user joined the J2C voice channel
      if (!oldState.channelId && newState.channelId === config.voiceChannelId) {
        // User joined the J2C channel - create a new voice channel for them
        await createTempVoiceChannel(guild, member, config);
      }

      // Check if user left a temp voice channel
      if (oldState.channelId && !newState.channelId) {
        // User left a voice channel - check if it was a temp channel
        await handleUserLeaveChannel(oldState.channelId, guild, config);
      }

      // Check if user moved from temp channel to another channel
      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        // User moved channels - check if they left a temp channel
        await handleUserLeaveChannel(oldState.channelId, guild, config);
      }
    } catch (error) {
      console.error('Error in J2C voiceStateUpdate event:', error);
    }
  },
};

async function createTempVoiceChannel(guild, member, config) {
  try {
    // Create a new voice channel for the user
    const newChannel = await guild.channels.create({
      name: `${member.displayName}'s Channel`,
      type: ChannelType.GuildVoice,
      parent: config.categoryId,
      permissionOverwrites: [
        {
          id: member.id,
          allow: [
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.MoveMembers
          ]
        },
        {
          id: guild.roles.everyone,
          allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel],
          deny: [PermissionsBitField.Flags.Speak]
        }
      ]
    });

    // Move the user to their new channel
    await member.voice.setChannel(newChannel);

    // Save the temp channel in the database
    await TempVC.create({
      guildId: guild.id,
      channelId: newChannel.id,
      ownerId: member.id,
      creatorId: member.id
    });

    // Removed notification to control panel
  } catch (error) {
    console.error('Error creating temp voice channel:', error);
    
    // Try to notify the user if possible
    try {
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Channel Creation Failed')
            .setDescription('Failed to create your voice channel. Please contact a server administrator.')
        ]
      }).catch(() => null); // Ignore if we can't send DM
    } catch (dmError) {
      console.error('Error sending DM to user:', dmError);
    }
  }
}

async function handleUserLeaveChannel(channelId, guild, config) {
  try {
    // Check if this was a temp voice channel
    const tempChannel = await TempVC.getChannel(channelId);
    if (!tempChannel) return;

    // Get the channel object
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      // Channel no longer exists, delete from database
      await TempVC.deleteChannel(channelId);
      return;
    }

    // Check if the owner left the channel
    // If the owner left, delete the channel immediately regardless of other users
    const owner = guild.members.cache.get(tempChannel.ownerId);
    if (owner && !channel.members.has(tempChannel.ownerId)) {
      // Owner left, delete channel immediately
      // Find and delete any associated chat channels
      const channelName = channel.name;
      const chatChannels = guild.channels.cache.filter(
        ch => ch.type === ChannelType.GuildText && 
        ch.name === `${channelName}-chat`
      );
      
      // Log how many chat channels were found
      console.log(`Found ${chatChannels.size} associated chat channels for voice channel ${channelName}`);
      
      // Delete all found chat channels
      for (const [, chatChannel] of chatChannels) {
        try {
          await chatChannel.delete();
          console.log(`Successfully deleted chat channel: ${chatChannel.name} (${chatChannel.id})`);
        } catch (chatDeleteError) {
          console.error('Error deleting associated chat channel:', chatDeleteError);
        }
      }
      
      // Delete the voice channel
      await channel.delete();
      await TempVC.deleteChannel(channelId);
      
      // Log successful deletion
      console.log(`Successfully deleted temporary voice channel (owner left): ${channelName} (${channelId})`);
      return;
    }

    // For non-owners, check if the channel is now empty
    if (channel.members.size === 0) {
      // Capture the channel name before deletion
      const channelName = channel.name;
      
      // Channel is empty, delete it after a delay
      setTimeout(async () => {
        try {
          // Check again if channel is still empty
          const updatedChannel = guild.channels.cache.get(channelId);
          if (updatedChannel && updatedChannel.members.size === 0) {
            // Find and delete any associated chat channels
            const chatChannels = guild.channels.cache.filter(
              ch => ch.type === ChannelType.GuildText && 
              ch.name === `${channelName}-chat`
            );
            
            // Log how many chat channels were found
            console.log(`Found ${chatChannels.size} associated chat channels for voice channel ${channelName}`);
            
            // Delete all found chat channels
            for (const [, chatChannel] of chatChannels) {
              try {
                await chatChannel.delete();
                console.log(`Successfully deleted chat channel: ${chatChannel.name} (${chatChannel.id})`);
              } catch (chatDeleteError) {
                console.error('Error deleting associated chat channel:', chatDeleteError);
              }
            }
            
            // Delete the voice channel
            await updatedChannel.delete();
            await TempVC.deleteChannel(channelId);
            
            // Log successful deletion
            console.log(`Successfully deleted temporary voice channel: ${channelName} (${channelId})`);
          }
        } catch (deleteError) {
          console.error('Error deleting temp voice channel:', deleteError);
        }
      }, 5000); // Wait 5 seconds before deleting
    }
  } catch (error) {
    console.error('Error handling user leave channel:', error);
  }
}