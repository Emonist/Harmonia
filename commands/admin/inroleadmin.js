const { EmbedBuilder, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder /*, StringSelectMenuBuilder*/ } = require("discord.js");

module.exports = {
  name: 'inroleadmin',
  aliases: [],
  description: 'Admins Commands',
  category: 'Utility',
  cooldown: 5000,

  async execute(client, message, args, prefix) {
    // ----- SAFE OWNER CHECK -----
    const botOwners = process.env.BOT_OWNER?.split(',').map(s => s.trim()) || [];
    const isOwner = botOwners.includes(message.author.id);

    // ----- PERMISSION GATE -----
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && !isOwner) {
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

    // ----- LOADING MESSAGE -----
    const loadingMsg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(process.env.color)
          .setDescription(`${client.emoji?.loading || '⏳'} | Fetching administrators, please wait...`)
      ]
    });

    try {
      // ----- FORCE-FETCH ALL MEMBERS (accurate count) -----
      // Requires "Server Members Intent" enabled in Dev Portal.
      const allMembers = await message.guild.members.fetch();

      // ----- DETECT ADMINS (include guild owner) -----
      const adminsAll = allMembers.filter(m =>
        m.id === message.guild.ownerId ||
        m.permissions.has(PermissionsBitField.Flags.Administrator)
      );

      // Exclude bots from the list (keeping your original behavior)
      const adminsHumans = adminsAll.filter(m => !m.user.bot);

      // Build display list
      const adminArray = Array.from(adminsHumans.values());
      // Optional: stable ordering by username
      adminArray.sort((a, b) => a.user.tag.localeCompare(b.user.tag));

      const memberTags = adminArray.map((m, i) =>
        `\`${i + 1}.\` **[\`${m.user.tag}\`](https://discord.com/users/${m.user.id}) - \`${m.user.id}\`**`
      );

      const totalCount = memberTags.length;

      // Done loading
      await loadingMsg.delete().catch(() => {});

      // ----- NONE FOUND (debug/help) -----
      if (totalCount === 0) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(process.env.color || 'Orange')
              .setAuthor({ name: `Role Members Debug`, iconURL: message.guild.iconURL({ dynamic: true }) || undefined })
              .setTitle(`${client.emoji?.users || '👥'} Admins`)
              .setDescription(`No human administrators were found.`)
              .addFields(
                {
                  name: 'Possible Reasons',
                  value:
                    '1. Only the server owner has full permissions and no one has the **Administrator** permission bit.\n' +
                    '2. Bot lacks **Server Members Intent**; enable it in the Developer Portal.\n' +
                    '3. Try again after some time if the member cache was cold.'
                },
                {
                  name: 'Guild Info',
                  value: `Owner: <@${message.guild.ownerId}>\nMember Count: ${message.guild.memberCount}`
                }
              )
              .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
          ]
        });
      }

      // ----- EMBED / PAGINATION -----
      const titlePrefix = client.emoji?.users || '👥';
      const makeEmbed = (page, pageSize, totalPages) => {
        const start = page * pageSize;
        const end = Math.min((page + 1) * pageSize, memberTags.length);
        return new EmbedBuilder()
          .setColor(process.env.color || null)
          .setAuthor({
            name: `List Of Members With Admin`,
            iconURL: message.guild.iconURL({ dynamic: true }) || undefined
          })
          .setTitle(`${titlePrefix} Members With Perms - \`Admin\`  : \`${totalCount}\``)
          .setDescription(`**Page : \`${page + 1}/${totalPages}\`**\n\n${memberTags.slice(start, end).join('\n')}`)
          .setFooter({ text: `Requested By ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
      };

      const buildActionRow = () => {
        const previousButton = new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setCustomId('previous')
          .setEmoji(client.emoji?.back || '◀️')
          .setLabel('Previous');

        const delButton = new ButtonBuilder()
          .setStyle(ButtonStyle.Danger)
          .setCustomId('del')
          .setEmoji(client.emoji?.delete || '🗑️')
          .setLabel('Delete');

        const nextButton = new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setCustomId('next')
          .setEmoji(client.emoji?.arrow || '▶️')
          .setLabel('Next');

        return new ActionRowBuilder().addComponents(previousButton, delButton, nextButton);
      };

      if (memberTags.length > 10) {
        let page = 0;
        const pageSize = 10;
        const totalPages = Math.ceil(memberTags.length / pageSize);

        const embedMessage = await message.channel.send({
          embeds: [makeEmbed(page, pageSize, totalPages)],
          components: [buildActionRow()]
        });

        const filter = (interaction) =>
          ['previous', 'del', 'next'].includes(interaction.customId) &&
          interaction.user.id === message.author.id;

        const collector = embedMessage.createMessageComponentCollector({ filter, time: 90_000 });

        collector.on('collect', async (interaction) => {
          if (interaction.customId === 'previous') {
            page = Math.max(0, page - 1);
          } else if (interaction.customId === 'del') {
            await embedMessage.delete().catch(() => {});
            collector.stop();
            return;
          } else if (interaction.customId === 'next') {
            page = Math.min(totalPages - 1, page + 1);
          }
          await interaction.update({ embeds: [makeEmbed(page, pageSize, totalPages)] });
        });

        collector.on('end', async () => {
          if (!embedMessage.deleted) {
            // Keep the last embed visible; just disable controls.
            await embedMessage.edit({ components: [] }).catch(() => {});
          }
        });
      } else {
        // <= 10 members: simple embed
        await message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(process.env.color || null)
              .setAuthor({
                name: `List Of Members With Admin`,
                iconURL: message.guild.iconURL({ dynamic: true }) || undefined
              })
              .setTitle(`${titlePrefix} Members With Perms - \`Admin\`  : \`${totalCount}\``)
              .setDescription(memberTags.join('\n'))
              .setFooter({ text: `Requested By ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
          ]
        });
      }

    } catch (err) {
      // Clean loading if error
      await loadingMsg.delete().catch(() => {});
      console.error('inroleadmin error:', err);
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(process.env.color || 'Red')
            .setDescription('An error occurred while fetching administrators.')
            .addFields({ name: 'Error', value: `\`\`\`${err.message}\`\`\`` })
        ]
      });
    }
  },
};
