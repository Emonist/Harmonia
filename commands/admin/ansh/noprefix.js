const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, SelectMenuBuilder } = require("discord.js");
const NoPrefix = require('../../models/NoPrefix');

/**
 * Parses a duration string into a Date object or null for permanent.
 * @param {string} durationStr
 * @returns {Date|null}
 */
// function parseDuration(durationStr) {
//   if (!durationStr) return null;
//   if (durationStr.toLowerCase() === 'permanent') return null;

//   const now = Date.now();
//   let multiplier;
//   let num;

//   if (durationStr.endsWith('d')) {
//     multiplier = 86400000; // Days to milliseconds
//     num = parseInt(durationStr.slice(0, -1));
//   } else if (durationStr.endsWith('m')) {
//     multiplier = 30 * 86400000; // Months to milliseconds (approx.)
//     num = parseInt(durationStr.slice(0, -1));
//   } else {
//     return null;
//   }

//   if (isNaN(num) || num <= 0) return null;
//   return new Date(now + num * multiplier);
// }
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
  name: 'noprefix',
  aliases: ['npr'],
  npstaff:true,
  description:
    'Manage global no prefix users (add, remove, list, reset) - Bot Owner only',
  async execute(client, message, args,prefix) {

    const subcommand = args[0]?.toLowerCase();
    if (!subcommand) {
      return message.reply(
        '  Please provide a subcommand: `add`, `remove`, `list`, or `reset`.',
      );
    }

    if (subcommand === 'add') {
    const targetUser =
        message.mentions.users.first() ||
        (await client.users.fetch(args[1]).catch(() => null));
    if (!targetUser) {
        return message.reply('Please mention a valid user or provide a user ID.');
    }

    const existingUser = await NoPrefix.findOne({ userId: targetUser.id });
    
    // Check if user already has no-prefix that hasn't expired
    if (existingUser) {
        if (existingUser.expiresAt && existingUser.expiresAt > new Date()) {
            const expiresDisplay = existingUser.expiresAt
                ? `until <t:${Math.floor(existingUser.expiresAt.getTime() / 1000)}:R>`
                : 'permanently';
            return message.reply(
                `❌ **${targetUser.tag}** already has no-prefix ${expiresDisplay}.`
            );
        } else if (!existingUser.expiresAt) { // Permanent case
            return message.reply(
                `❌ **${targetUser.tag}** already has permanent no-prefix.`
            );
        }
    }

    let durationArg = args[2];
    if (!durationArg) {
        durationArg = 'permanent';
    }

    const expiresAt = parseDuration(durationArg);
    if (durationArg.toLowerCase() !== 'permanent' && !expiresAt) {
        return message.reply(
            'Invalid duration format. Use `permanent`, or a value like `30d`, `1d`, `7d`, `1m`, etc.'
        );
    }

    await NoPrefix.findOneAndUpdate(
        { userId: targetUser.id },
        { userId: targetUser.id, expiresAt: expiresAt },
        { upsert: true, new: true },
    );

    message.channel.send({ 
        embeds: [new EmbedBuilder()
            .setColor(process.env.color)
            .setDescription(`**${client.emoji.tick} \`|\` Successfully Added \`Non-Prefix\` to ${targetUser.tag} For: \`${durationArg}\`**`)
        ]
    });

    return targetUser.send({
        embeds: [
            new EmbedBuilder()
                .setColor(process.env.color)
                .setTitle('<:giveaway:1426873119355703408> Congratulations!')
                .setDescription(`**You have been granted \`Non-Prefix\` access for \`${durationArg}\`!**\nYou can now use commands without prefix during this period.`)
                .setTimestamp()
        ]
    }).catch(() => {
        // Handle if user has DMs disabled
        message.channel.send({ 
            content: `${client.emoji.cross} Could not DM ${targetUser.tag}. They might have their DMs disabled.`
        });
    });
} else if (subcommand === 'remove') {
      const targetUser =
        message.mentions.users.first() ||
        (await client.users.fetch(args[1]).catch(() => null));
      if (!targetUser) {
        return message.reply(
          '  Please mention a valid user or provide a user ID.',
        );
      }
      const existingUser = await NoPrefix.findOne({ userId: targetUser.id });
      if (!existingUser) {
        return message.reply(
          `❌ **${targetUser.tag}** doesn't have no-prefix privileges.`
        );
      }

      const result = await NoPrefix.findOneAndDelete({ userId: targetUser.id });
      if (result) {
        message.channel.send({ embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`**${client.emoji.tick} \`|\` Successfully Removed \`Non-Prefix\` From ${targetUser.tag}**`)] })
        return;
      } else {
        return message.reply(
          `  **${targetUser.tag}** is not in the no-prefix list.`,
        );
      }
    } else if (subcommand === 'list') {
  const entries = await NoPrefix.find({});
  if (!entries.length) {
    return message.reply('✅ No users in the no-prefix list.');
  }

  // Show loading message
  const loadingMsg = await message.channel.send({embeds:[new EmbedBuilder().setDescription(`**${client.emoji.loading} |  Loading no-prefix users...**`)]});

  let count = 0;
  let memberTags = [];

  // Process users in batches to avoid rate limits
  const batchSize = 25; // Process 25 users at a time
  const totalBatches = Math.ceil(entries.length / batchSize);

  for (let batch = 0; batch < totalBatches; batch++) {
    const start = batch * batchSize;
    const end = start + batchSize;
    const batchEntries = entries.slice(start, end);

    try {
      // Fetch batch of users with delay between batches
      if (batch > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between batches
      }

      const batchResults = await Promise.all(
        batchEntries.map(entry =>
          client.users.fetch(entry.userId)
            .then(user => ({ success: true, user, entry }))
            .catch(error => ({ success: false, userId: entry.userId, error }))
        )
      );

      for (const result of batchResults) {
        if (!result.success) continue;

        count++;
        const expiresDisplay = result.entry.expiresAt
          ? `<t:${Math.floor(result.entry.expiresAt.getTime() / 1000)}:R>`
          : 'Permanent';
        
        memberTags.push(`**\`${count}.\` [\`${result.user.username}#${result.user.discriminator}\`](https://discord.com/users/${result.user.id}) | \`${result.user.id}\`**\nExpires: ${expiresDisplay}`);
      }

      // Update loading message with progress
      if (totalBatches > 1) {
        await loadingMsg.edit({embeds:[new EmbedBuilder().setDescription(`**${client.emoji.loading} |  Loading no-prefix users... \`${batch + 1}/${totalBatches}\` batches processed \n It May Takes SomeTime**`)]});
      }

    } catch (error) {
      console.error('Error processing batch:', error);
      continue;
    }
  }

  // Delete loading message
  await loadingMsg.delete().catch(() => {});

  if (memberTags.length === 0) {
    return message.reply('❌ Could not fetch any user information due to rate limits.');
  }

  // Pagination code
  if (memberTags.length > 10) {
    let page = 0;
    const totalPages = Math.ceil(memberTags.length / 10);

    const generateEmbed = () => {
      const start = page * 10;
      const end = Math.min((page + 1) * 10, memberTags.length);

      return new EmbedBuilder()
        .setColor(process.env.color)
        .setAuthor({
          name: `List Of Members With No Prefix`,
          iconURL: message.guild.iconURL({ dynamic: true })
        })
        .setTitle(`${client.emoji.users} No Prefix Users: ${count}`)
        .setDescription(`**Page: ${page + 1}/${totalPages}**\n\n${memberTags.slice(start, end).join('\n\n')}`)
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL()
        });
    };

    const buildActionRow = () => {
      return new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('previous')
            .setEmoji(client.emoji.back)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('del')
            .setEmoji(client.emoji.delete)
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('next')
            .setEmoji(client.emoji.arrow)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === totalPages - 1)
        );
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
      time: 120000
    });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'previous') {
        page = Math.max(0, page - 1);
      } else if (interaction.customId === 'del') {
        await interaction.deferUpdate();
        await embedMessage.delete();
        collector.stop();
        return;
      } else if (interaction.customId === 'next') {
        page = Math.min(totalPages - 1, page + 1);
      }

      await interaction.update({ 
        embeds: [generateEmbed()],
        components: [buildActionRow()]
      });
    });

    collector.on('end', (collected, reason) => {
      if (reason !== 'messageDelete' && embedMessage.editable) {
        embedMessage.edit({ 
          content: '⏰ This menu has expired',
          components: [] 
        }).catch(() => {});
      }
    });

  } else {
    // Single page for <= 10 users
    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(process.env.color)
          .setAuthor({
            name: `List Of Members With No Prefix`,
            iconURL: message.guild.iconURL({ dynamic: true })
          })
          .setTitle(`${client.emoji.users} No Prefix Users: ${count}`)
          .setDescription(memberTags.join('\n\n'))
          .setFooter({
            text: `Requested by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL()
          })
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
                          const deletedCount = (await NoPrefix.deleteMany({})).deletedCount;
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