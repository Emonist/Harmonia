const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, SelectMenuBuilder } = require("discord.js");
const Premium = require('../../models/premium');

function parseDuration(durationArg) {
  if (durationArg.toLowerCase() === 'permanent') return null;

  const durationRegex = /^(\d+)(s|m|h|d|w|mo|y)$/i;
  const match = durationArg.match(durationRegex);
  if (!match) return null;

  const [_, amount, unit] = match;
  const duration = parseInt(amount);
  const now = new Date();

  switch (unit.toLowerCase()) {
    case 's':
      return new Date(now.setSeconds(now.getSeconds() + duration));
    case 'm':
      return new Date(now.setMinutes(now.getMinutes() + duration));
    case 'h':
      return new Date(now.setHours(now.getHours() + duration));
    case 'd':
      return new Date(now.setDate(now.getDate() + duration));
    case 'w':
      return new Date(now.setDate(now.getDate() + duration * 7));
    case 'mo':
      return new Date(now.setMonth(now.getMonth() + duration));
    case 'y':
      return new Date(now.setFullYear(now.getFullYear() + duration));
    default:
      return null;
  }
}

module.exports = {
  name: 'premium',
  aliases: ['pre'],
  owner:true,
  description:
    'Manage global premium users (add, remove, list) - Bot Owner only',
  async execute(client, message, args,prefix) {

    const subcommand = args[0]?.toLowerCase();
    if (!subcommand) {
      return message.reply(
        '  Please provide a subcommand: `add`, `remove`, `reset`, or `list`.',
      );
    }

    if (subcommand === 'add') {
      const targetUser =
        message.mentions.users.first() ||
        (await client.users.fetch(args[1]).catch(() => null));
      if (!targetUser) {
        return message.reply(
          '  Please mention a valid user or provide a user ID.',
        );
      }

      const existingUser = await Premium.findOne({ userId: targetUser.id });
            if (existingUser && existingUser.expiresAt && existingUser.expiresAt > new Date()) {
              const expiresDisplay = existingUser.expiresAt
                ? `until <t:${Math.floor(existingUser.expiresAt.getTime() / 1000)}:R>`
                : 'permanently';
              return message.reply(
                `❌ **${targetUser.tag}** already has Premium privileges ${expiresDisplay}.`
              );
            }
      
            let durationArg = args[2];
            if (!durationArg) {
              durationArg=`permanent`
            }

      const expiresAt = parseDuration(durationArg);
      if (durationArg.toLowerCase() !== 'permanent' && !expiresAt) {
        return message.reply(
          '  Invalid duration format. Use `permanent`, or a value like `30d`, `1h`, `7d`, `1mo`, etc.',
        );
      }

      await Premium.findOneAndUpdate(
        { userId: targetUser.id },
        {
          userId: targetUser.id,
          expiresAt: expiresAt,
          grantedBy: message.author.id,
          grantedAt: new Date(),
        },
        { upsert: true, new: true },
      );

      const embed = new EmbedBuilder()
        .setColor(process.env.color)
        .setDescription(`**${client.emoji.tick} \`|\` Successfully Added \`Premium\` to ${targetUser.tag} For: \`${durationArg}\`**`)

      await message.reply({ embeds: [embed] });

      try {
        await targetUser.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#00FF00')
              .setTitle('<:giveaway:1426873119355703408> Global Premium Granted!')
              .setDescription(
                `You now have global premium status for **${durationArg}** across all guilds with this bot!`,
              )
              .setFooter({ text: 'Enjoy your premium benefits!' }),
          ],
        });
      } catch (error) {
        console.error(`Could not DM ${targetUser.tag}:`, error);
      }
    } else if (subcommand === 'remove') {
      const targetUser =
        message.mentions.users.first() ||
        (await client.users.fetch(args[1]).catch(() => null));
      if (!targetUser) {
        return message.reply(
          '  Please mention a valid user or provide a user ID.',
        );
      }
      const existingUser = await Premium.findOne({ userId: targetUser.id });
      if (!existingUser) {
        return message.reply(
          `❌ **${targetUser.tag}** doesn't have premium status.`
        );
      }

      const result = await Premium.findOneAndDelete({ userId: targetUser.id });
      if (result) {
        const embed = new EmbedBuilder()
          .setColor(process.env.color)
          .setDescription(`**${client.emoji.tick} \`|\` Successfully Removed \`Premium\` from ${targetUser.tag}**`)
        return message.reply({ embeds: [embed] });
      } else {
        return message.reply(
          `  **${targetUser.tag}** is not in the global premium list.`,
        );
      }
    } else if (subcommand === 'list') {
      const entries = await Premium.find({});
      if (!entries.length) {
        return message.reply('✅ No users in the premium list.');
      }

      let count = 0;
      let memberTags = [];

      for (const entry of entries) {
        try {
          const user = await client.users.fetch(entry.userId);
          count++;
          const expiresDisplay = entry.expiresAt
            ? `<t:${Math.floor(entry.expiresAt.getTime() / 1000)}:R>`
            : 'Permanent';
          memberTags.push(`**\`${count}.\` [\`${user.username}#${user.discriminator}\`](https://discord.com/users/${user.id}) | \`${user.id}\`**\nExpires: ${expiresDisplay}`);
        } catch (err) {
          continue;
        }
      }

      if (memberTags.length > 10) {
        let page = 0;
        const totalPages = Math.ceil(memberTags.length / 10);

        const generateEmbed = () => {
          const start = page * 10;
          const end = Math.min((page + 1) * 10, memberTags.length);

          return new EmbedBuilder()
            .setColor(process.env.color)
            .setAuthor({
              name: `List Of Members With Premium`,
              iconURL: message.guild.iconURL({ dynamic: true })
            })
            .setTitle(`${client.emoji.users}Premium Members : \`${count}\``)
            .setDescription(`**<:Harmonia:1224417172319899841> Page : \`${page + 1}/${totalPages}\`**\n\n${memberTags.slice(start, end).join('\n')}`)
            .setFooter({
              text: `Requested By ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL()
            });
        };

        const embedMessage = await message.channel.send({
          embeds: [generateEmbed()],
          components: [buildActionRow()]
        });

        const filter = interaction => {
          return ['previous', 'del', 'next'].includes(interaction.customId) && interaction.user.id === message.author.id;
        };

        const collector = embedMessage.createMessageComponentCollector({
          filter,
          time: 90000
        });

        collector.on('collect', async interaction => {
          if (interaction.customId === 'previous') {
            page = Math.max(0, page - 1);
          } else if (interaction.customId === 'del') {
            embedMessage.delete();
            collector.stop();
          } else if (interaction.customId === 'next') {
            page = Math.min(totalPages - 1, page + 1);
          }

          await interaction.update({ embeds: [generateEmbed()] });
        });

        collector.on('end', () => {
          embedMessage.edit({ content: `This Menu Is Expired`, components: [] });
        });
      } else {
        message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(process.env.color)
              .setAuthor({
                name: `List Of Members With Premium`,
                iconURL: message.guild.iconURL({ dynamic: true })
              })
              .setTitle(`${client.emoji.users}Premium Members : \`${count}\``)
              .setDescription(`${memberTags.join('\n')}`)
          ]
        });
      }
    } else if (subcommand === 'reset') {
      let b1 = new ButtonBuilder().setStyle(ButtonStyle.Success).setCustomId(`m1`).setEmoji(client.emoji.tick).setLabel(`Confirm`)
            let b2 = new ButtonBuilder().setStyle(ButtonStyle.Danger).setCustomId(`m2`).setEmoji(client.emoji.cross).setLabel(`Cancle`)
            let em1 = new EmbedBuilder().setColor(process.env.color).setDescription("**Are you sure you want to Reset \`Premium\` List?**");
            let ro3 = new ActionRowBuilder().addComponents(b1,b2);
            let msg = await message.channel.send({embeds : [em1],components : [ro3]});
            let call = await msg.createMessageComponentCollector({
                filter:(o) =>{
                    if(o.user.id === message.author.id) return true;
                    else{
                        return o.reply({content : `${client.emoji.cross} | This is not your session run ${prefix}npr reset instead.`,ephemeral : true})
                    }
                },
                //time : 50000,
            });
            call.on('collect',async(int) => {
                if(int.isButton())
                {
                    if(int.customId === `m1`)
                    {
                      setTimeout(() => {
                        int.update({embeds:[new EmbedBuilder().setDescription("**<a:loading:1426621893464817666> | Please Wait Reseting No Prefix Data**")],components : []})
                    }, 1000);
                    const deletedCount = (await Premium.deleteMany({})).deletedCount;
                      return setTimeout(() => {
                        msg.edit({embeds:[new EmbedBuilder().setDescription(`**${client.emoji.tick} | Successfully Removed ${deletedCount} users from \`Premium\`.**`)]})
                    }, 2500);
                    }
                    if(int.customId === `m2`)
                    {
                        return msg.delete().then(
                            message.delete()
                        )
                    }
                    
                }
            })
    } else {
      return message.reply(
        '  Invalid subcommand. Use `add`, `remove`, `list`, or `reset`.',
      );
    }
    function buildActionRow() {
          const previousButton = new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setCustomId('previous')
            .setEmoji(client.emoji.back);
          
          const del = new ButtonBuilder()
            .setStyle(ButtonStyle.Danger)
            .setCustomId('del')
            .setEmoji("<:delete:1426619613323460779>");
          
          const nextButton = new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setCustomId('next')
            .setEmoji(client.emoji.arrow);
        
          return new ActionRowBuilder()
            .addComponents(previousButton, del, nextButton);
        }
  },
};
