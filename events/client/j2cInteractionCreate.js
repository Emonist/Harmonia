const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  PermissionsBitField,
  MessageFlags
} = require('discord.js');
const TempVC = require('../../models/TempVC');
const J2CConfig = require('../../models/J2CConfig');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      // Handle button interactions for J2C
      if (interaction.isButton() && interaction.customId.startsWith('j2c_')) {
        await handleJ2CButton(interaction);
        return; // Return early to prevent further processing
      }
      
      // Handle modal submissions for J2C
      if (interaction.isModalSubmit() && interaction.customId.startsWith('j2c_modal_')) {
        await handleJ2CModal(interaction);
        return; // Return early to prevent further processing
      }
    } catch (error) {
      console.error('Error in J2C interaction handler:', error);
      
      // Only try to respond if the interaction is still valid and hasn't been acknowledged
      if (interaction.isButton() || interaction.isModalSubmit()) {
        if (!interaction.replied && !interaction.deferred) {
          try {
            await interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setColor('#FF0000')
                  .setTitle('❌ Error')
                  .setDescription('An error occurred while processing your request.')
              ],
              flags: [MessageFlags.Ephemeral]
            });
          } catch (replyError) {
            // Ignore errors when trying to send error responses
            console.error('Error sending error response:', replyError);
          }
        }
      }
    }
  },
};

async function handleJ2CButton(interaction) {
  const customId = interaction.customId;
  const member = interaction.member;
  const guild = interaction.guild;
  
  // Check if user is in a voice channel
  if (!member.voice.channel) {
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🎙️ Not in Voice Channel')
            .setDescription('You need to be in a voice channel to use these controls.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    } else {
      return;
    }
  }

  // Get the user's temp channel
  const tempChannel = await TempVC.getChannel(member.voice.channelId);
  if (!tempChannel || tempChannel.ownerId !== member.id) {
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🎙️ No Temporary Channel Found')
            .setDescription('You don\'t have a temporary voice channel. Join the "➕ Join to Create" channel to create one.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    } else {
      return;
    }
  }

  // Handle different button actions
  switch (customId) {
    case 'j2c_lock':
      await lockChannel(interaction, member.voice.channel);
      break;
    case 'j2c_unlock':
      await unlockChannel(interaction, member.voice.channel);
      break;
    case 'j2c_hide':
      await hideChannel(interaction, member.voice.channel);
      break;
    case 'j2c_unhide':
      await unhideChannel(interaction, member.voice.channel);
      break;
    case 'j2c_limit':
      await showLimitModal(interaction);
      break;
    case 'j2c_invite':
      await createInvite(interaction, member.voice.channel);
      break;
    case 'j2c_ban':
      await showBanModal(interaction);
      break;
    case 'j2c_permit':
      await showPermitModal(interaction);
      break;
    case 'j2c_rename':
      await showRenameModal(interaction);
      break;
    case 'j2c_bitrate':
      await showBitrateModal(interaction);
      break;
    case 'j2c_region':
      await showRegionModal(interaction);
      break;
    case 'j2c_template':
      await showTemplateModal(interaction);
      break;
    case 'j2c_chat':
      await createChatChannel(interaction, member.voice.channel, guild);
      break;
    case 'j2c_waiting':
      await showWaitingModal(interaction);
      break;
    case 'j2c_claim':
      await claimChannel(interaction, member.voice.channel, tempChannel);
      break;
    case 'j2c_transfer':
      await showTransferModal(interaction);
      break;
    default:
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('❌ Unknown Action')
              .setDescription('This action is not recognized.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      }
  }
}

async function handleJ2CModal(interaction) {
  const customId = interaction.customId;
  const member = interaction.member;
  
  // Check if user is in a voice channel
  if (!member.voice.channel) {
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🎙️ Not in Voice Channel')
            .setDescription('You need to be in a voice channel to use these controls.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    } else {
      return;
    }
  }

  // Get the user's temp channel
  const tempChannel = await TempVC.getChannel(member.voice.channelId);
  if (!tempChannel || tempChannel.ownerId !== member.id) {
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🎙️ No Temporary Channel Found')
            .setDescription('You don\'t have a temporary voice channel. Join the "➕ Join to Create" channel to create one.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    } else {
      return;
    }
  }

  // Handle different modal submissions
  switch (customId) {
    case 'j2c_modal_limit':
      const limit = parseInt(interaction.fields.getTextInputValue('limit'));
      if (isNaN(limit) || limit < 0 || limit > 99) {
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Invalid Limit')
                .setDescription('Please enter a valid number between 0 and 99.')
            ],
            flags: [MessageFlags.Ephemeral]
          });
        } else {
          return;
        }
      }
      await setChannelLimit(interaction, member.voice.channel, limit);
      break;
    case 'j2c_modal_ban':
      const banUserId = interaction.fields.getTextInputValue('ban_user');
      await banUser(interaction, member.voice.channel, banUserId);
      break;
    case 'j2c_modal_permit':
      const permitUserId = interaction.fields.getTextInputValue('permit_user');
      await permitUser(interaction, member.voice.channel, permitUserId);
      break;
    case 'j2c_modal_rename':
      const newName = interaction.fields.getTextInputValue('new_name');
      if (!newName || newName.length < 1 || newName.length > 100) {
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Invalid Name')
                .setDescription('Channel name must be between 1 and 100 characters.')
            ],
            flags: [MessageFlags.Ephemeral]
          });
        } else {
          return;
        }
      }
      await renameChannel(interaction, member.voice.channel, newName);
      break;
    case 'j2c_modal_bitrate':
      const bitrate = parseInt(interaction.fields.getTextInputValue('bitrate'));
      if (isNaN(bitrate) || bitrate < 8000 || bitrate > 384000) {
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Invalid Bitrate')
                .setDescription('Please enter a valid bitrate between 8000 and 384000.')
            ],
            flags: [MessageFlags.Ephemeral]
          });
        } else {
          return;
        }
      }
      await setBitrate(interaction, member.voice.channel, bitrate);
      break;
    case 'j2c_modal_transfer':
      const transferUserId = interaction.fields.getTextInputValue('transfer_user');
      await transferOwnership(interaction, member.voice.channel, transferUserId, tempChannel);
      break;
  }
}

// Channel control functions
async function lockChannel(interaction, channel) {
  try {
    // Check if channel still exists
    if (!channel.guild.channels.cache.has(channel.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      Connect: false
    });
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🔒 Channel Locked')
            .setDescription(`Your channel ${channel} has been locked.`)
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  } catch (error) {
    console.error('Error locking channel:', error);
    // Check if it's a channel not found error
    if (error.code === 10003) { // Unknown channel
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Lock Failed')
            .setDescription('Failed to lock the channel.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
}

async function unlockChannel(interaction, channel) {
  try {
    // Check if channel still exists
    if (!channel.guild.channels.cache.has(channel.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      Connect: true
    });
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🔓 Channel Unlocked')
            .setDescription(`Your channel ${channel} has been unlocked.`)
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  } catch (error) {
    console.error('Error unlocking channel:', error);
    // Check if it's a channel not found error
    if (error.code === 10003) { // Unknown channel
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Unlock Failed')
            .setDescription('Failed to unlock the channel.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
}

async function hideChannel(interaction, channel) {
  try {
    // Check if channel still exists
    if (!channel.guild.channels.cache.has(channel.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      ViewChannel: false
    });
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('👁️ Channel Hidden')
            .setDescription(`Your channel ${channel} has been hidden.`)
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  } catch (error) {
    console.error('Error hiding channel:', error);
    // Check if it's a channel not found error
    if (error.code === 10003) { // Unknown channel
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Hide Failed')
            .setDescription('Failed to hide the channel.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
}

async function unhideChannel(interaction, channel) {
  try {
    // Check if channel still exists
    if (!channel.guild.channels.cache.has(channel.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      ViewChannel: true
    });
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('👁️ Channel Unhidden')
            .setDescription(`Your channel ${channel} has been unhidden.`)
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  } catch (error) {
    console.error('Error unhiding channel:', error);
    // Check if it's a channel not found error
    if (error.code === 10003) { // Unknown channel
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Unhide Failed')
            .setDescription('Failed to unhide the channel.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
}

// Modal creation functions
async function showLimitModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('j2c_modal_limit')
    .setTitle('Set Channel Limit');

  const limitInput = new TextInputBuilder()
    .setCustomId('limit')
    .setLabel('User Limit (0 for no limit)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter a number between 0 and 99')
    .setRequired(true)
    .setMaxLength(2);

  const row = new ActionRowBuilder().addComponents(limitInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function showBanModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('j2c_modal_ban')
    .setTitle('Ban User');

  const banInput = new TextInputBuilder()
    .setCustomId('ban_user')
    .setLabel('User ID to Ban')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the user ID')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(banInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function showPermitModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('j2c_modal_permit')
    .setTitle('Permit User');

  const permitInput = new TextInputBuilder()
    .setCustomId('permit_user')
    .setLabel('User ID to Permit')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the user ID')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(permitInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function showRenameModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('j2c_modal_rename')
    .setTitle('Rename Channel');

  const renameInput = new TextInputBuilder()
    .setCustomId('new_name')
    .setLabel('New Channel Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the new name')
    .setRequired(true)
    .setMaxLength(100);

  const row = new ActionRowBuilder().addComponents(renameInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function showBitrateModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('j2c_modal_bitrate')
    .setTitle('Set Bitrate');

  const bitrateInput = new TextInputBuilder()
    .setCustomId('bitrate')
    .setLabel('Bitrate (8000-384000)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter bitrate in bits per second')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(bitrateInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function showTransferModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('j2c_modal_transfer')
    .setTitle('Transfer Ownership');

  const transferInput = new TextInputBuilder()
    .setCustomId('transfer_user')
    .setLabel('User ID to Transfer To')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the user ID')
    .setRequired(true);

  const row = new ActionRowBuilder().addComponents(transferInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

async function showRegionModal(interaction) {
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('🌐 Region Selection')
          .setDescription('Region selection is not yet implemented.')
      ],
      flags: [MessageFlags.Ephemeral]
    });
  }
}

async function showTemplateModal(interaction) {
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('📋 Template Selection')
          .setDescription('Templates are not yet implemented.')
      ],
      flags: [MessageFlags.Ephemeral]
    });
  }
}

async function showWaitingModal(interaction) {
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('⏳ Waiting Room')
          .setDescription('Waiting room feature is not yet implemented.')
      ],
      flags: [MessageFlags.Ephemeral]
    });
  }
}

// Modal action functions
async function setChannelLimit(interaction, channel, limit) {
  try {
    // Check if channel still exists
    if (!channel.guild.channels.cache.has(channel.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    await channel.setUserLimit(limit);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('👥 Limit Set')
            .setDescription(`Channel limit set to ${limit === 0 ? 'no limit' : limit} users.`)
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  } catch (error) {
    console.error('Error setting channel limit:', error);
    // Check if it's a channel not found error
    if (error.code === 10003) { // Unknown channel
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Limit Failed')
            .setDescription('Failed to set channel limit.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
}

async function banUser(interaction, channel, userId) {
  try {
    // Check if channel still exists
    if (!channel.guild.channels.cache.has(channel.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    const user = await interaction.guild.members.fetch(userId);
    if (!user) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('❌ User Not Found')
              .setDescription('Could not find a user with that ID.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }

    await channel.permissionOverwrites.edit(user, {
      Connect: false,
      ViewChannel: false
    });

    // If user is in the channel, disconnect them
    if (channel.members.has(user.id)) {
      await user.voice.disconnect();
    }

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🚫 User Banned')
            .setDescription(`${user} has been banned from your channel.`)
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  } catch (error) {
    console.error('Error banning user:', error);
    // Check if it's a channel not found error
    if (error.code === 10003) { // Unknown channel
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    // Check if it's a user not found error
    if (error.code === 10007) { // Unknown member
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('❌ User Not Found')
              .setDescription('Could not find a user with that ID.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Ban Failed')
            .setDescription('Failed to ban the user.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
}

async function permitUser(interaction, channel, userId) {
  try {
    // Check if channel still exists
    if (!channel.guild.channels.cache.has(channel.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    const user = await interaction.guild.members.fetch(userId);
    if (!user) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('❌ User Not Found')
              .setDescription('Could not find a user with that ID.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }

    await channel.permissionOverwrites.edit(user, {
      Connect: true,
      ViewChannel: true
    });

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ User Permitted')
            .setDescription(`${user} has been given access to your channel.`)
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  } catch (error) {
    console.error('Error permitting user:', error);
    // Check if it's a channel not found error
    if (error.code === 10003) { // Unknown channel
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    // Check if it's a user not found error
    if (error.code === 10007) { // Unknown member
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('❌ User Not Found')
              .setDescription('Could not find a user with that ID.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Permit Failed')
            .setDescription('Failed to give user access.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
}

async function renameChannel(interaction, channel, newName) {
  try {
    // Check if channel still exists
    if (!channel.guild.channels.cache.has(channel.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    const oldName = channel.name;
    await channel.setName(newName);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✏️ Channel Renamed')
            .setDescription(`Channel renamed from "${oldName}" to "${newName}".`)
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  } catch (error) {
    console.error('Error renaming channel:', error);
    // Check if it's a channel not found error
    if (error.code === 10003) { // Unknown channel
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Rename Failed')
            .setDescription('Failed to rename the channel.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
}

async function setBitrate(interaction, channel, bitrate) {
  try {
    // Check if channel still exists
    if (!channel.guild.channels.cache.has(channel.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    const oldBitrate = channel.bitrate;
    await channel.setBitrate(bitrate);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📶 Bitrate Set')
            .setDescription(`Bitrate changed from ${oldBitrate} to ${bitrate}.`)
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  } catch (error) {
    console.error('Error setting bitrate:', error);
    // Check if it's a channel not found error
    if (error.code === 10003) { // Unknown channel
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Bitrate Failed')
            .setDescription('Failed to set the bitrate.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
}

async function createInvite(interaction, channel) {
  try {
    // Check if channel still exists
    if (!channel.guild.channels.cache.has(channel.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    const invite = await channel.createInvite({
      maxAge: 0, // Never expires
      maxUses: 0 // Unlimited uses
    });
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📨 Invite Created')
            .setDescription(`Invite link: ${invite.toString()}`)
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  } catch (error) {
    console.error('Error creating invite:', error);
    // Check if it's a channel not found error
    if (error.code === 10003) { // Unknown channel
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Invite Failed')
            .setDescription('Failed to create an invite.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
}

async function createChatChannel(interaction, voiceChannel, guild) {
  try {
    // Check if voice channel still exists
    if (!voiceChannel.guild.channels.cache.has(voiceChannel.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your voice channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    // Check if a chat channel already exists for this voice channel
    const existingChannels = guild.channels.cache.filter(
      ch => ch.type === ChannelType.GuildText && 
      ch.name === `${voiceChannel.name}-chat`
    );
    
    if (existingChannels.size > 0) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('💬 Chat Exists')
              .setDescription('A chat channel already exists for your voice channel.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }

    // Create the chat channel
    const chatChannel = await guild.channels.create({
      name: `${voiceChannel.name}-chat`,
      type: ChannelType.GuildText,
      parent: voiceChannel.parentId,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.member.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }
      ]
    });

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💬 Chat Channel Created')
            .setDescription(`Chat channel created: ${chatChannel}`)
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  } catch (error) {
    console.error('Error creating chat channel:', error);
    // Check if it's a channel not found error
    if (error.code === 10003) { // Unknown channel
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your voice channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Chat Creation Failed')
            .setDescription('Failed to create a chat channel.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
}

async function claimChannel(interaction, channel, tempChannel) {
  try {
    // Check if channel still exists
    if (!channel.guild.channels.cache.has(channel.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    // Check if the original owner is still in the guild
    const owner = await interaction.guild.members.fetch(tempChannel.ownerId).catch(() => null);
    
    // If owner is no longer in the guild or not in the voice channel, allow claiming
    if (!owner || !channel.members.has(tempChannel.ownerId)) {
      // Update the owner in the database
      await TempVC.transferOwnership(channel.id, interaction.member.id);
      
      // Update channel permissions
      await channel.permissionOverwrites.edit(interaction.member.id, {
        Connect: true,
        ViewChannel: true,
        ManageChannels: true,
        MoveMembers: true
      });
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#00FF00')
              .setTitle('👑 Channel Claimed')
              .setDescription(`You are now the owner of ${channel}.`)
          ],
          flags: [MessageFlags.Ephemeral]
        });
      }
    } else {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('👑 Cannot Claim')
              .setDescription('The original owner is still in the channel.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      }
    }
  } catch (error) {
    console.error('Error claiming channel:', error);
    // Check if it's a channel not found error
    if (error.code === 10003) { // Unknown channel
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    // Check if it's a user not found error
    if (error.code === 10007) { // Unknown member
      // This is expected if the owner left the guild, so we can still allow claiming
      // Update the owner in the database
      await TempVC.transferOwnership(channel.id, interaction.member.id);
      
      // Update channel permissions
      await channel.permissionOverwrites.edit(interaction.member.id, {
        Connect: true,
        ViewChannel: true,
        ManageChannels: true,
        MoveMembers: true
      });
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#00FF00')
              .setTitle('👑 Channel Claimed')
              .setDescription(`You are now the owner of ${channel}.`)
          ],
          flags: [MessageFlags.Ephemeral]
        });
      }
      return;
    }
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Claim Failed')
            .setDescription('Failed to claim the channel.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
}

async function transferOwnership(interaction, channel, userId, tempChannel) {
  try {
    // Check if channel still exists
    if (!channel.guild.channels.cache.has(channel.id)) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    const newOwner = await interaction.guild.members.fetch(userId);
    if (!newOwner) {
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('❌ User Not Found')
              .setDescription('Could not find a user with that ID.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }

    // Update the owner in the database
    await TempVC.transferOwnership(channel.id, userId);
    
    // Update channel permissions for old owner
    await channel.permissionOverwrites.edit(interaction.member.id, {
      Connect: true,
      ViewChannel: true
    });
    
    // Update channel permissions for new owner
    await channel.permissionOverwrites.edit(userId, {
      Connect: true,
      ViewChannel: true,
      ManageChannels: true,
      MoveMembers: true
    });
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('👑 Ownership Transferred')
            .setDescription(`Channel ownership transferred to ${newOwner}.`)
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  } catch (error) {
    console.error('Error transferring ownership:', error);
    // Check if it's a channel not found error
    if (error.code === 10003) { // Unknown channel
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setTitle('🎙️ Channel Not Found')
              .setDescription('Your channel no longer exists.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    // Check if it's a user not found error
    if (error.code === 10007) { // Unknown member
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('❌ User Not Found')
              .setDescription('Could not find a user with that ID.')
          ],
          flags: [MessageFlags.Ephemeral]
        });
      } else {
        return;
      }
    }
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Transfer Failed')
            .setDescription('Failed to transfer channel ownership.')
        ],
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
}
