const { EmbedBuilder, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const AutoReactDB = require('../../models/AutoReact'); // You'll need to create this model

module.exports = {
  name: 'autoreact',
  aliases: ['auto-react'],
  description: 'Manage automatic reactions to specific words/phrases',
  category: 'Utility',
  cooldown: 5000,
  async execute(client, message, args, prefix) {
    // Permission check
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) && !process.env.BOT_OWNER.includes(message.author.id)) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(process.env.color)
            .setAuthor({
              name: `| You need Manage Messages permission`,
              iconURL: message.author.displayAvatarURL({ dynamic: true }),
            }),
        ],
      });
    }

    const subcommand = args[0]?.toLowerCase();
    const trigger = args[1];
    const emoji = args[2];

    // Help menu if no subcommand
    if (!subcommand || subcommand === 'help') {
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('AutoReact Help')
        .setDescription(`**Usage:** ${prefix}autoreact <option>\n\n**Options:**`)
        .addFields(
          { name: '`add <trigger> <emoji>`', value: 'Add new auto-reaction', inline: true },
          { name: '`remove <trigger>`', value: 'Remove auto-reaction', inline: true },
          { name: '`list`', value: 'Show all auto-reactions', inline: true },
          { name: '`reset`', value: 'Clear ALL auto-reactions', inline: true }
        );

      return message.reply({ embeds: [embed] });
    }

    try {
      switch (subcommand) {
        case 'add':
          if (!trigger || !emoji) {
            return message.channel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(process.env.color)
                  .setDescription(`**❌ Usage: \`${prefix}autoreact add <trigger> <emoji>\`**`)
              ]
            });
          }

          // Validate emoji
          const emojiRegex = /^<a?:.+?:\d+>$|^[\uD800-\uDBFF][\uDC00-\uDFFF]$/;
          if (!emojiRegex.test(emoji)) {
            return message.channel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(process.env.color)
                  .setDescription('❌ Please provide a valid emoji!')
              ]
            });
          }

          await AutoReactDB.findOneAndUpdate(
            { guildId: message.guild.id, trigger: trigger.toLowerCase() },
            { emoji },
            { upsert: true }
          );

          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription(`✅ Now reacting with ${emoji} when "${trigger}" is mentioned`)
            ]
          });

        case 'remove':
          if (!trigger) {
            return message.channel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(process.env.color)
                  .setDescription(`❌ Usage: \`${prefix}autoreact remove <trigger>\``)
              ]
            });
          }

          const result = await AutoReactDB.deleteOne({ 
            guildId: message.guild.id, 
            trigger: trigger.toLowerCase() 
          });

          if (result.deletedCount === 0) {
            return message.channel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(process.env.color)
                  .setDescription(`❌ No auto-reaction found for "${trigger}"`)
              ]
            });
          }

          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription(`✅ Removed auto-reaction for "${trigger}"`)
            ]
          });

        case 'list':
          const reactions = await AutoReactDB.find({ guildId: message.guild.id });
          
          if (!reactions.length) {
            return message.channel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(process.env.color)
                  .setDescription('❌ No auto-reactions set up yet!')
              ]
            });
          }

          const embed = new EmbedBuilder()
            .setColor(process.env.color)
            .setTitle('Auto-Reactions List')
            .setDescription(reactions.map(r => `• **${r.trigger}** → ${r.emoji}`).join('\n'));

          return message.channel.send({ embeds: [embed] });

          case 'reset':
          const confirmRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('confirm_reset')
                .setLabel('Confirm Reset')
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId('cancel_reset')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
            );

          const confirmMsg = await message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription('⚠️ **This will delete ALL auto-reactions!**')
                .setFooter({ text: 'You have 15 seconds to confirm' })
            ],
            components: [confirmRow]
          });

          const filter = i => i.user.id === message.author.id;
          const collector = confirmMsg.createMessageComponentCollector({
            filter,
            time: 15000
          });

          collector.on('collect', async i => {
            if (i.customId === 'confirm_reset') {
              await AutoReactDB.deleteMany({ guildId: message.guild.id });
              await i.update({
                embeds: [
                  new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription('✅ Successfully reset ALL auto-reactions!')
                ],
                components: []
              });
            } else {
              await i.update({
                embeds: [
                  new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription('❌ Reset cancelled')
                ],
                components: []
              });
            }
            collector.stop();
          });

          collector.on('end', () => {
            confirmMsg.edit({ components: [] }).catch(() => {});
          });
          break;

        default:
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription(`❌ Invalid subcommand. Use \`${prefix}autoreact help\``)
            ]
          });
      }
    } catch (err) {
      console.error(err);
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('❌ An error occurred while processing your request')
        ]
      });
    }
  },
};