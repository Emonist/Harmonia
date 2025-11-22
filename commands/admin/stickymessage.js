const { EmbedBuilder, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const StickyMessage = require('../../models/StickyMessage');
const { checkVote } = require('../../helpers/checkVote');

module.exports = {
  name: 'stickymessages',
  aliases: ['sm', 'sticky', 'stickymessage'],
  description: 'Manage sticky messages in channels',
  category: 'Utility',
  cooldown: 5000,
  async execute(client, message, args, prefix) {
    // Vote check
    const hasVoted = await checkVote(client, message);
    if (!hasVoted) return;
    
    // Permission check
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && !process.env.BOT_OWNER.includes(message.author.id)) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(process.env.color)
            .setAuthor({
              name: `| You are lacking permissions: Administrator`,
              iconURL: message.author.displayAvatarURL({ dynamic: true }),
            }),
        ],
      });
    }

    // Check for subcommand
    if (!args[0]) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(process.env.color)
            .setDescription(`**${client.emoji.cross} | \`${prefix}stickymessages <add/remove/list>\`**`)
        ]
      });
    }

    const subCommand = args[0].toLowerCase();

    switch (subCommand) {
      case 'add':
        await handleAdd(client, message, args.slice(1));
        break;
      case 'remove':
        await handleRemove(client, message, args.slice(1));
        break;
      case 'list':
        await handleList(client, message);
        break;
      default:
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(process.env.color)
              .setDescription(`**${client.emoji.cross} | Invalid subcommand. Use \`add\`, \`remove\`, or \`list\`**`)
          ]
        });
    }
  },
};

async function handleAdd(client, message, args, prefix) {
  if (args.length < 2) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(process.env.color)
          .setDescription(`**${client.emoji.cross} | stickymessage add #channel <message>**`)
      ]
    });
  }

  const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
  if (!channel) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(process.env.color)
          .setDescription(`**${client.emoji.cross} | Please mention a valid channel!**`)
      ]
    });
  }

  const stickyMessage = args.slice(1).join(' ');

  // Create buttons for message type selection
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('normal_message')
        .setLabel('Normal')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('embed_message')
        .setLabel('Embed')
        .setStyle(ButtonStyle.Primary)
    );

  const confirmEmbed = new EmbedBuilder()
    .setColor(process.env.color)
    .setTitle('Sticky Message Type')
    .setDescription('How would you like to display the sticky message?')
    .addFields(
      { name: 'Channel', value: `${channel}`, inline: true },
      { name: 'Message', value: stickyMessage.length > 1024 ? stickyMessage.substring(0, 1021) + '...' : stickyMessage, inline: true }
    );

  const confirmMsg = await message.reply({ embeds: [confirmEmbed], components: [row] });

  try {
    const interaction = await confirmMsg.awaitMessageComponent({
      filter: i => i.user.id === message.author.id,
      time: 30000
    });

    const isEmbed = interaction.customId === 'embed_message';

    // Sanitize message content
    const sanitizedMessage = args.slice(1).join(' ').replace(/@(everyone|here)/g, '@\u200b$1');

    // Save to database
    await StickyMessage.findOneAndUpdate(
      { guildId: message.guild.id, channelId: channel.id },
      {
        message: sanitizedMessage,
        isEmbed,
        createdBy: message.author.id
      },
      { upsert: true, new: true }
    );

    const successEmbed = new EmbedBuilder()
      .setColor(process.env.color)
      .setDescription(`**${client.emoji.tick} | Sticky message set in ${channel} as \`${isEmbed ? 'an embed' : 'a normal message'}\`.**`);

    await interaction.update({ embeds: [successEmbed], components: [] });

    // Send initial sticky message
    await sendStickyMessage(client, channel, sanitizedMessage, isEmbed);

  } catch (error) {
    console.error('Error setting up sticky message:', error);
    await confirmMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(process.env.color)
          .setDescription(`**${client.emoji.cross} | Setup timed out or failed.**`)
      ],
      components: []
    });
  }
}

async function handleRemove(client, message, args) {
  if (!args.length) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(process.env.color)
          .setDescription(`**${client.emoji.cross} | Please mention a channel!**`)
      ]
    });
  }

  const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
  if (!channel) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(process.env.color)
          .setDescription(`**${client.emoji.cross} | Please mention a valid channel!**`)
      ]
    });
  }

  const deleted = await StickyMessage.findOneAndDelete({
    guildId: message.guild.id,
    channelId: channel.id
  });

  if (!deleted) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(process.env.color)
          .setDescription(`**${client.emoji.cross} | No sticky message found in that channel!**`)
      ]
    });
  }

  // Try to delete the last sticky message if it exists
  if (deleted.lastMessageId) {
    try {
      await channel.messages.delete(deleted.lastMessageId);
    } catch (error) {
      console.error('Error deleting sticky message:', error);
    }
  }

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(process.env.color)
        .setDescription(`**${client.emoji.tick} | Removed sticky message from ${channel}.**`)
    ]
  });
}

async function handleList(client, message) {
  const stickyMessages = await StickyMessage.find({ guildId: message.guild.id });

  if (!stickyMessages.length) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(process.env.color)
          .setDescription('**No sticky messages set up in this server.**')
      ]
    });
  }

  const itemsPerPage = 5;
  const pages = Math.ceil(stickyMessages.length / itemsPerPage);
  let currentPage = 0;

  const generateEmbed = async (page) => {
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = stickyMessages.slice(start, end);

    const embed = new EmbedBuilder()
      .setColor(process.env.color)
      .setTitle('Server Sticky Messages')
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter({
        text: `Page ${page + 1} of ${pages} • ${stickyMessages.length} Messages Total`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      });

    let description = `**${client.emoji.tick} | Sticky Messages Overview\n\n**`;
    description += pageItems.map((item, index) => {
      const channel = message.guild.channels.cache.get(item.channelId);
      return `\`${start + index + 1}.\` ${channel ? channel.toString() : '`Deleted Channel`'}\n` +
        `• \`${item.message.substring(0, 40)}${item.message.length > 40 ? '...' : ''}\``;
    }).join('\n\n');

    embed.setDescription(description);
    return embed;
  };

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('previous')
        .setEmoji(client.emoji.back)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('cancel')
        .setEmoji(client.emoji.cross)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('next')
        .setEmoji(client.emoji.arrow)
        .setStyle(ButtonStyle.Secondary)
    );

  const initialEmbed = await generateEmbed(currentPage);
  const msg = await message.reply({ embeds: [initialEmbed], components: [row] });

  const collector = msg.createMessageComponentCollector({
    filter: i => i.user.id === message.author.id,
    time: 300000
  });

  collector.on('collect', async interaction => {
    switch (interaction.customId) {
      case 'previous':
        currentPage = Math.max(0, currentPage - 1);
        break;
      case 'cancel':
        collector.stop();
        await msg.delete().catch(() => { });
        return;
      case 'next':
        currentPage = Math.min(pages - 1, currentPage + 1);
        break;
    }

    await interaction.update({
      embeds: [await generateEmbed(currentPage)],
      components: [row]
    });
  });

  collector.on('end', () => {
    row.components.forEach(button => button.setDisabled(true));
    msg.edit({ components: [row] }).catch(() => { });
  });
}

async function sendStickyMessage(client, channel, content, isEmbed) {
  try {
    const sticky = await StickyMessage.findOne({
      guildId: channel.guild.id,
      channelId: channel.id
    });

    // Delete previous sticky message if it exists
    if (sticky?.lastMessageId) {
      try {
        await channel.messages.delete(sticky.lastMessageId);
      } catch (error) {
        console.error('Error deleting previous sticky message:', error);
      }
    }

    // Suppress mentions in message content
    const messageContent = content.replace(/@(everyone|here)/g, '@\u200b$1');

    const messageOptions = {
      allowedMentions: {
        parse: ['users', 'roles'], // Only allow user and role mentions
        repliedUser: false
      }
    };

    if (isEmbed) {
      messageOptions.embeds = [
        new EmbedBuilder()
          .setColor(process.env.color)
          .setDescription(messageContent)
      ];
    } else {
      messageOptions.content = messageContent;
    }

    const sentMessage = await channel.send(messageOptions);

    // Update database with new message ID
    await StickyMessage.updateOne(
      { guildId: channel.guild.id, channelId: channel.id },
      { lastMessageId: sentMessage.id }
    );
  } catch (error) {
    console.error('Error sending sticky message:', error);
  }
}