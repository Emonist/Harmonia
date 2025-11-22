const GuildSettings = require('../../models/guildSettings');
const NoPrefix = require('../../models/NoPrefix');
const StickyMessage = require('../../models/StickyMessage');
const { logCommand, logError } = require('../../helpers/webhookLogger');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  // Component V2 imports
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');
const Premium = require('../../models/premium');
const CustomRole = require('../../models/CustomRole');
const cooldownManager = require('../../handlers/cooldownHandler');
const { PermissionsBitField } = require('discord.js');
module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    // Check if database is ready before processing
    if (!client.data) {
      console.warn('Database not ready, skipping message processing');
      return;
    }

    /** Afk Controler**/
    const db = require('../../models/afk')
    let afkdata = await db.findOne({
      Member: message.author.id
    })
    if (afkdata) {
      if (message.author.id === afkdata.Member) {
        const tt = (Date.now() - afkdata.Time) / 1000;
        const ttt = formatTime(tt);
        await afkdata.deleteOne()
        // Check if message.channel exists before sending reply
        if (message.channel) {
          return message.reply(`**<a:hey:1227954665962995783> Welcome Back ${message.author}**, *You were away for* **\`${ttt}\`**`);
        }
      }
    }
    const memberMentioned = message.mentions.users.first()

    if (memberMentioned) {
      afkdata = await db.findOne({
        Member: memberMentioned.id
      })
      if (afkdata) {
        const allowedMentions = {
          parse: ['users'], // Allow user and role mentions
          repliedUser: false, // Mention the user being replied to
        };
        // Check if message.channel exists before sending reply
        if (message.channel) {
          message.reply({
            content: `**${memberMentioned.username}** *went Global AFK <t:${Math.round(afkdata.Time / 1000)}:R> With Reason ${afkdata.Reason}*`,
            allowedMentions: allowedMentions,
          });
        }

      }
    }
    const gdb = require('../../models/safk')
    // Check if message.guild exists before accessing its id
    if (!message.guild) return;
    let gafkdata = await gdb.findOne({
      Guild: message.guild.id,
      SMember: message.author.id
    })
    if (gafkdata) {
      if (message.author.id === gafkdata.SMember) {
        const tt = (Date.now() - gafkdata.STime) / 1000;
        const ttt = formatTime(tt);
        await gafkdata.deleteOne()
        // Check if message.channel exists before sending reply
        if (message.channel) {
          return message.reply(`**<a:hey:1227954665962995783> Welcome Back ${message.author}**, *You were away for* **\`${ttt}\`**`);
        }
      }
    }
    const gmemberMentioned = message.mentions.users.first()

    if (gmemberMentioned) {
      // Check if message.guild exists before accessing its id
      if (!message.guild) return;
      gafkdata = await gdb.findOne({
        Guild: message.guild.id,
        SMember: gmemberMentioned.id
      })
      if (gafkdata) {
        const allowedMentions = {
          parse: ['users'],
          repliedUser: false,
        };
        // Check if message.channel exists before sending reply
        if (message.channel) {
          message.reply({
            content: `**${gmemberMentioned.username}** *went Server AFK <t:${Math.round(gafkdata.STime / 1000)}:R> With Reason ${gafkdata.SReason}*`,
            allowedMentions: allowedMentions,
          });
        }

      }
    }

    function formatTime(duration) {
      const days = Math.floor(duration / 86400);
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = Math.floor(duration % 60);
      let formattedTime = '';

      if (days > 0) {
        formattedTime += `${days} hour${days > 1 ? 's' : ''} `;
      }
      if (hours > 0) {
        formattedTime += `${hours} hour${hours > 1 ? 's' : ''} `;
      }
      if (minutes > 0 || hours > 0) {
        formattedTime += `${minutes} minute${minutes > 1 ? 's' : ''} `;
      }
      formattedTime += `${seconds} second${seconds > 1 ? 's' : ''}`;

      return formattedTime;
    }
    /** End Of Afk Commands**/

    /** Start Of Auto Respond */
    const AutoRespond = require("../../models/autorespond");
    // Check if message.guild exists before accessing its id
    if (!message.guild) return;
    const autoResponds = await AutoRespond.find({ guildId: message.guild.id });
    for (const ar of autoResponds) {
      if (message.content.toLowerCase().startsWith(ar.triggerWord.toLowerCase())) {
        // Send the response message
        if (ar.isEmbed) {
          // Check if message.channel exists before sending message
          if (message.channel) {
            const embed = new EmbedBuilder()
              .setDescription(ar.responseMessage)
              .setColor("#00FF00");
            message.channel.send({ embeds: [embed] });
          }
        } else {
          // Check if message.channel exists before sending message
          if (message.channel) {
            message.channel.send(ar.responseMessage);
          }
        }
        break; // Stop checking after the first match
      }
    }
    /**End of Autorespond */

    /**Start Sticy messages */
    try {
      const sticky = await StickyMessage.findOne({ channelId: message.channel.id });
      if (sticky) {
        // Delete previous sticky message if it exists
        if (sticky.lastMessageId) {
          // Check if message.channel exists before fetching messages
          if (message.channel) {
            try {
              const oldMessage = await message.channel.messages.fetch(sticky.lastMessageId);
              if (oldMessage) await oldMessage.delete().catch(() => { });
            } catch (error) {
              // Message might be already deleted, ignore error
            }
          }
        }

        // Send new sticky message
        let newMessage;
        if (sticky.isEmbed) {
          // Check if message.channel exists before sending message
          if (message.channel) {
            const embed = new EmbedBuilder()
              .setColor(process.env.color)
              .setDescription(sticky.message);
            newMessage = await message.channel.send({ embeds: [embed] });
          }
        } else {
          // Check if message.channel exists before sending message
          if (message.channel) {
            newMessage = await message.channel.send(sticky.message);
          }
        }

        // Update last message ID in database
        sticky.lastMessageId = newMessage.id;
        await sticky.save();
      }
    } catch (error) {
      console.error('Error handling sticky message:', error);
    }
    /**Sticky Messages */

    // Check if message.guild exists before accessing its id
    if (!message.guild) return;
    const settings = await GuildSettings.findOne({ guildId: message.guild.id });

    // Get prefix first to check if it's a command
    let prefix = client.prefixes.get(message.guild.id);
    if (!prefix) {
      try {
        const guildData = await GuildSettings.findOne({ guildId: message.guild.id }).lean();
        prefix = guildData?.prefix || process.env.Prefix;
        if (client.prefixes.size < 500) {
          client.prefixes.set(message.guild.id, prefix);
        }
      } catch (error) {
        prefix = process.env.Prefix;
      }
    }
    message.prefix = prefix;

    // Check if it's a command first - commands should work even in music controller channel
    const isCommand = message.content.startsWith(prefix) || message.mentions.has(client.user);
    let isNoPrefix = await NoPrefix.findOne({ userId: message.author.id }).catch(() => null);
    // Convert to boolean and check expiration
    isNoPrefix = isNoPrefix && (!isNoPrefix.expiresAt || isNoPrefix.expiresAt > new Date());
    const shouldProcessCommand = isCommand || isNoPrefix;

    /** MUSIC CONTROLLER LOGIC **/
    // Only process music controller if it's NOT a command
    if (settings?.musicController && message.channel.id === settings.musicController && !shouldProcessCommand) {
      await message.delete().catch(() => { });

      const songName = message.content.trim();
      if (!songName) return;
      if (!message.member.voice.channel) {
        const noVoiceEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription('❌ You need to be in a voice channel to play music!');
        // Check if channel still exists before sending message
        if (message.channel) {
          return message.channel.send({ embeds: [noVoiceEmbed] });
        }
        return;
      }

      try {
        let player = client.poru?.players?.get(message.guild.id);
        
        if (!player) {
          // Create player to stay in VC
          player = client.poru.createConnection({
            guildId: message.guild.id,
            voiceChannel: message.member.voice.channel.id,
            textChannel: message.channel.id,
            deaf: true,
          });
        }

        const result = await client.poru.resolve({ 
          query: songName, 
          source: 'ytsearch',
          requester: message.author 
        });

        if (!result || !result.tracks || result.tracks.length === 0) {
          const noResultEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('❌ No songs found!');
          // Check if channel still exists before sending message
          if (message.channel) {
            return message.channel.send({ embeds: [noResultEmbed] });
          }
          return;
        }

        player.queue.add(result.tracks[0]);
        if (!player.isPlaying && !player.isPaused) player.play();
      } catch (error) {
        console.error('Error playing song:', error);
        const errorEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription('❌ Error: Could not play the song');
        // Check if channel still exists before sending message
        if (message.channel) {
          await message.channel.send({ embeds: [errorEmbed] });
        }
      }
      return;
    }

    /** PREFIX HANDLING - Memory optimized **/
    // Check if message.guild exists before accessing its id
    if (!message.guild) return;
    if (message.author.bot) return;
    if (message.content.trim() === `<@${client.user.id}>` || message.content.trim() === `<@!${client.user.id}>`) {
      // Create a short and clean Component V2 design
      const { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
      
      // Create a concise, modern design
      const mainContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## Hi ${message.author}! <a:admin:1426600691639783524>\n\n` +
            `**Prefix:** \`${prefix}\`\n` +
            `**Members:** \`${message.guild.memberCount}\`\n\n` +
            `<a:stolen_emoji_or_sticker:1426097431128309881> Join a voice channel and type \`${prefix}play <song>\` to start!\n` +
            `<a:stolen_emoji_or_sticker:1426097431128309881> Use \`${prefix}help\` for all commands.`
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setEmoji('<a:music:1426585737482080277>')
              .setLabel('Invite')
              .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=415602886720&scope=bot`),
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setEmoji('<a:Shield:1426625065344176190>')
              .setLabel('Support')
              .setURL('https://discord.gg/devhaven')
          )
        );
      
      // Check if message.channel exists before sending message
      if (message.channel) {
        return message.channel.send({ 
          components: [mainContainer],
          flags: MessageFlags.IsComponentsV2
        }).catch((e) => { 
          message.author.send({ content: `Error: ${e.message}` }).catch(() => { }) 
        });
      }
    }

    
    /** CUSTOM ROLE SYSTEM **/
    try {
      const usedPrefix = message.content.startsWith(prefix) || message.mentions.has(client.user);

      if (usedPrefix || isNoPrefix) {
        const args = message.content.trim().split(/ +/);
        if (usedPrefix) {
          args[0] = message.mentions.has(client.user)
            ? args[0].replace(new RegExp(`^<@!?${client.user.id}>`), '')
            : args[0].slice(prefix.length);
        }

        if (args.length >= 2) {
          const trigger = args[0].toLowerCase();
          // Check if message.guild exists before accessing its id
          if (!message.guild) return;
          const guildId = message.guild.id;

          const customRole = await CustomRole.findOne({ guildId, trigger });
          if (customRole) {
            // Check if message.member exists before accessing properties
            if (!message.member) {
              const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> Member data not available!')
                .setTimestamp();
              return message.reply({ embeds: [errorEmbed] });
            }
            
            const role = message.guild.roles.cache.get(customRole.roleId);
            if (!role) {
              const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> The configured role no longer exists!')
                .setTimestamp();
              // Check if message.channel exists before sending reply
              if (message.channel) {
                return message.reply({ embeds: [errorEmbed] });
              }
            }

            const member = message.member;
            const guildData = await client.data?.get(`customrole_${message.guild.id}`);
            const hasManagerRole = guildData && member.roles.cache.has(guildData.reqrole);

            if (!hasManagerRole && !member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
              const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> You need the Manage Roles permission or the manager role to use this trigger!')
                .setTimestamp();
              // Check if message.channel exists before sending reply
              if (message.channel) {
                return message.reply({ embeds: [errorEmbed] });
              }
            }

            if (role.position >= member.roles.highest.position) {
              const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> You cannot assign a role that is higher than or equal to your highest role!')
                .setTimestamp();
              // Check if message.channel exists before sending reply
              if (message.channel) {
                return message.reply({ embeds: [errorEmbed] });
              }
            }

            const targetUser = message.mentions.members.first() ||
              message.guild.members.cache.get(args[1]);

            if (!targetUser) {
              const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> Please mention a valid user or provide a valid user ID!')
                .setTimestamp();
              // Check if message.channel exists before sending reply
              if (message.channel) {
                return message.reply({ embeds: [errorEmbed] });
              }
            }

            try {
              if (targetUser.roles.cache.has(role.id)) {
                await targetUser.roles.remove(role);
                const successEmbed = new EmbedBuilder()
                  .setColor(process.env.color)
                  .setDescription(`**<:Harmonia:1223517756410953763> \`Removed\` role ${role} \`from\` ${targetUser}**`)
                // Check if message.channel exists before sending message
                if (message.channel) {
                  return message.channel.send({ embeds: [successEmbed] });
                }
              } else {
                await targetUser.roles.add(role);
                const successEmbed = new EmbedBuilder()
                  .setColor(process.env.color)
                  .setDescription(`**<:Harmonia:1223517756410953763> \`Added\` role ${role} \`to\` ${targetUser}**`)
                // Check if message.channel exists before sending message
                if (message.channel) {
                  return message.channel.send({ embeds: [successEmbed] });
                }
              }
            } catch (error) {
              console.error('Error managing roles:', error);
              const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> Failed to modify roles. Please check bot permissions.')
                .setTimestamp();
              // Check if message.channel exists before sending reply
              if (message.channel) {
                return message.reply({ embeds: [errorEmbed] });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in custom role trigger:', error);
    }
    /** END CUSTOM ROLE SYSTEM **/

    const AutoReactDB = require('../../models/AutoReact');
    /** AUTO-REACT HANDLER **/
    try {
      // Only process auto-reacts for non-command messages
      if (!message.content.startsWith(prefix) && !message.mentions.has(client.user)) {
        // Check if message.guild exists before accessing its id
        if (!message.guild) return;
        const reactions = await AutoReactDB.find({ guildId: message.guild.id });
        if (reactions.length) {
          const content = message.content.toLowerCase();
          for (const { trigger, emoji } of reactions) {
            if (content.includes(trigger.toLowerCase())) {
              try {
                // Check if message exists before reacting
              if (message) {
                await message.react(emoji);
              }
              } catch (err) {
                console.error(`Failed to react with ${emoji}:`, err);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('AutoReact Error:', err);
    }
    /** END AUTO-REACT HANDLER **/
    
    /** NO-PREFIX CHECK **/
    // isNoPrefix is already declared above, reuse it
    const usedPrefix = message.content.startsWith(prefix) || message.mentions.has(client.user);

    if (!usedPrefix && !isNoPrefix) return;

    // const content = usedPrefix ? message.content.slice(prefix.length) : message.content;
    const content = usedPrefix ? (message.mentions.has(client.user) ? message.content.replace(new RegExp(`^<@!?${client.user.id}>`), '').trim() : message.content.slice(prefix.length)) : message.content;

    const args = content.trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    /** FIND COMMAND **/
    let command = client.commands.get(commandName) ||
      client.commands.find(cmd => cmd.aliases?.includes(commandName));

    if (!command) return;
    
    /** IGNORED CHANNEL CHECK **/
    if (command && settings?.ignoredChannels?.includes(message.channel.id) && message.author.id !== process.env.BOT_OWNER) {
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🚫 Ignored Channel')
        .setDescription('This channel is **ignored**, and commands will not work here.');

      // Check if message.channel exists before sending message
      if (message.channel) {
        const warning = await message.channel.send({ embeds: [embed] });
        setTimeout(() => warning.delete().catch(() => { }), 3000);
      }
      return;
    }
    
    /** PREMIUM CHECK **/
    if (command.premium && message.author.id !== process.env.BOT_OWNER) {
      const premiumEntry = await Premium.findOne({ userId: message.author.id });
      const isPremium = premiumEntry && (!premiumEntry.expiresAt || premiumEntry.expiresAt > new Date());

      if (!isPremium) {
        const premiumEmbed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('⚠️ Premium Command')
          .setDescription('This command is **premium-only**. You need global premium status to use it.');
        // Check if message.channel exists before sending reply
        if (message.channel) {
          return message.reply({ embeds: [premiumEmbed] });
        }
      }
    }

    /** VOTE CHECK **/
    if (command.vote && message.author.id !== process.env.BOT_OWNER) {
      const premiumEntry = await Premium.findOne({ userId: message.author.id });
      const isPremium = premiumEntry && (!premiumEntry.expiresAt || premiumEntry.expiresAt > new Date());

      if (!isPremium) {
        const hasVoted = await client.voteCheck(message.author.id);
        if (!hasVoted) {
          const voteEmbed = new EmbedBuilder()
            .setColor('#00ADEF')
            .setTitle('⚠️ Vote Required')
            .setDescription('You need to **vote** to use this command! [Click here to vote](https://top.gg/bot/1409051024936669184/vote)');
          // Check if message.channel exists before sending reply
          if (message.channel) {
            return message.reply({ embeds: [voteEmbed] });
          }
        }
      }
    }
    
    /** COOLDOWN CHECK **/
    if (command.cooldown && message.author.id !== process.env.BOT_OWNER) {
      const premiumEntry = await Premium.findOne({ userId: message.author.id });
      const isPremium = premiumEntry && (!premiumEntry.expiresAt || premiumEntry.expiresAt > new Date());

      if (!isPremium) {
        const cooldownTimeRemaining = cooldownManager(command.name, message.author.id, command.cooldown);
        if (cooldownTimeRemaining) {
          const secondsRemaining = Math.ceil(cooldownTimeRemaining / 1000);
          const cooldownEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⏳ Command on Cooldown')
            .setDescription(`Please wait **${secondsRemaining} second${secondsRemaining === 1 ? '' : 's'}** before using \`${command.name}\` again.`);
          // Check if message.channel exists before sending reply
          if (message.channel) {
            return message.reply({ embeds: [cooldownEmbed] });
          }
        }
      }
    }

    // 1️⃣ Blacklist Check
    const bl = await client.data.get(`blacklist_${client.user.id}`) || [];
    if (bl.includes(message.author.id) && message.author.id !== process.env.BOT_OWNER) {
      const em = new EmbedBuilder()
        .setColor('#fcf707')
        .setAuthor({ name: 'Blacklisted!' })
        .setDescription(`${client.emoji?.cross || '❌'} | You have been blacklisted from using my commands. Head to our [support server](https://discord.gg/devhaven) to check the reason and its solution.`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      const b1 = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Support')
            .setURL('https://discord.gg/devhaven')
        );

      
      if (message.channel) {
        return message.channel.send({ embeds: [em], components: [b1] }).catch(() => { });
      }
    }
    
    if (command.owner) {
      if (message.author.id !== process.env.BOT_OWNER) {
        // Check if message.channel exists before sending reply
        if (message.channel) {
          return message.reply('🚫 Only the bot owner can use this command.');
        }
        return;
      }
    }

    if (command.invc) {
      const userVoice = message.member.voice.channel;
      if (!userVoice) {
        // Check if message.channel exists before sending reply
        if (message.channel) {
          return message.reply(`${client.emoji.cross} | **🎧 You need to be in a voice channel to use this command.**`);
        }
      }
    }
    
    const player = client.poru?.players?.get(message.guild.id);
    if (player) {
      if (message.guild && message.guild.members.me?.voice.channel && command.samevc) {
        const userVoice = message.member?.voice?.channel;
        const botVoice = message.guild.members.me.voice.channel;
          if (!userVoice) {
      // Check if message.channel exists before sending reply
      if (message.channel) {
        return message.reply(`${client.emoji.cross} | **🎧 You must be in a voice channel**`);
      }
    }
        if (userVoice !== botVoice) {
          // Check if message.channel exists before sending reply
          if (message.channel) {
            return message.reply(`${client.emoji.cross} | **🎧 You must be in the **same** voice channel as me**`);
          }
        }
      }
    }
    
    if (command.owner) {
      if (message.author.id !== process.env.BOT_OWNER) {
        // Check if message.channel exists before sending reply
        if (message.channel) {
          return message.reply('🚫 Only the bot owner can use this command.');
        }
        return;
      }
    }
    
    if (command.npstaff) {
      const allowedIDs = [process.env.BOT_OWNER, ...process.env.NPSTAFF?.split(',') || []];

      if (!allowedIDs.includes(message.author.id)) {
        // Check if message.channel exists before sending reply
        if (message.channel) {
          return message.reply('🚫 Only the NP Staff can perform this command.');
        }
      }
    }
    
    /** UNDER PROGRESS CHECK **/
    if (command.underprogress && (!settings || !settings.underprogress)) {
      const underEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🚧 Feature Coming Soon')
        .setDescription('This command is **under development**. You will be able to use it soon.');
      // Check if message.channel exists before sending reply
      if (message.channel) {
        return message.reply({ embeds: [underEmbed] });
      }
    }

    /** EXECUTE COMMAND **/
    const startTime = Date.now();
    try {
        if (message.guild) {
        await message.guild.members.fetchMe();
    }
  await command.execute(client, message, args, prefix);
  
  // Log successful command execution
  const executionTime = Date.now() - startTime;
  await logCommand(client, {
    commandName,
    user: message.author,
    guild: message.guild,
    channel: message.channel,
    fullCommand: message.content,
    isSlash: false,
    args: args,
    executionTime: executionTime,
  });
  
} catch (error) {
  console.error(`❌ Error executing command "${commandName}":`, error);
  
  // Log error to webhook
  await logError(client, {
    error,
    context: 'Command Execution',
    user: message.author,
    guild: message.guild,
    channel: message.channel,
    commandName: commandName,
    additionalInfo: {
      fullCommand: message.content,
      args: args,
    },
  });
  
  if (error.code === 50013 || error.message.includes("Missing Permissions")) {
    const permEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🚫 Missing Permissions')
      .setDescription(
        `I don't have the required permissions to run **${commandName}**.\n\n` +
        `Please make sure I have the proper permissions and role hierarchy.`
      );
    // Check if message.channel exists before sending reply
    if (message.channel) {
      return message.reply({ embeds: [permEmbed] }).catch(() => {});
    }
  }
  const errorEmbed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle('⚠️ Command Execution Error')
    .setDescription(`An error occurred while executing **${commandName}**. Please try again later.`);
  // Check if message.channel exists before sending reply
  if (message.channel) {
    message.reply({ embeds: [errorEmbed] });
  }
}
  },
};

