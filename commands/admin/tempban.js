const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const TempBan = require('../../models/tempban');

module.exports = {
    name: 'tempban',
    aliases: [],
    description: 'Admins Commands',
    category: 'Utility',
    cooldown: 5000,
    async execute(client, message, args, prefix) {
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

        try {
            let user;
            if (args[0]) {
                if (args[0].startsWith('<@') && args[0].endsWith('>')) {
                    let mention = args[0].replace(/[<@!>]/g, '');
                    user = message.guild.members.cache.get(mention);
                } else {
                    user = message.guild.members.cache.get(args[0]);
                }
            }

            if (!user) return message.reply({
                embeds: [new EmbedBuilder().setDescription(`${client.emoji.cross} | Usage : \`${prefix}tempban @user <sec/min/hour/day> <reason> \``)]
            });

            const time = args[1];
            const timeRegex = /^(\d+)(s|sec|second|seconds|min|m|minutes|minute|hour|hr|hours|h|d|days|day|mon|month|months)$/;
            const timeMatch = time.match(timeRegex);

            if (!timeMatch) return message.reply({
                embeds: [new EmbedBuilder().setDescription(`${client.emoji.cross} | Usage : \`${prefix}tempban @user <sec/min/hour/day> <reason> \``)]
            });

            let reason = args.slice(2).join(' ') || 'No reason given';
            let milliseconds = 0;
            const duration = parseInt(timeMatch[1]);
            const timeUnit = timeMatch[2];

            switch (timeUnit) {
                case 's': case 'sec': case 'second': case 'seconds':
                    milliseconds = duration * 1000;
                    break;
                case 'min': case 'm': case 'minute': case 'minutes':
                    milliseconds = duration * 60000;
                    break;
                case 'hour': case 'hr': case 'h': case 'hours':
                    milliseconds = duration * 3600000;
                    break;
                case 'd': case 'day': case 'days':
                    milliseconds = duration * 86400000;
                    break;
                case 'month': case 'mon': case 'months':
                    milliseconds = duration * 2592000000;
                    break;
                default:
                    return message.reply({
                        embeds: [new EmbedBuilder().setDescription(`${client.emoji.cross} | Invalid time format`)]
                    });
            }

            const member = message.guild.members.cache.get(user.id);
            
            // Validation checks
            if (member.id === message.guild.ownerId) return message.channel.send({
                embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`${client.emoji.cross} | You can't **Ban** Server Owner`)]
            });
            
            if (process.env.BOT_OWNER.includes(member.id)) return message.channel.send({
                embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`${client.emoji.cross} | I can't **Ban** my owner.`)]
            });

            if (member.id === message.member.id) return message.channel.send({
                embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`${client.emoji.cross} | You cannot **Ban** Yourself.`)]
            });

            if (!member.bannable) return message.channel.send({
                embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`${client.emoji.cross} | I can't **ban** that user. Please check my role position and permissions.`)]
            });

            const expireAt = new Date(Date.now() + milliseconds);

            // Create temp ban entry in database
            const tempBan = new TempBan({
                guildId: message.guild.id,
                userId: member.id,
                moderatorId: message.author.id,
                reason: reason,
                expireAt: expireAt,
                duration: time
            });

            await tempBan.save();

            // Execute the ban
            await message.guild.members.ban(user.id, { reason: `${message.author.username} | ${reason}` });

            const formattedEndTime = `<t:${Math.floor(expireAt.getTime() / 1000)}:R>`;
            
            // Send confirmation message
            let msg = await message.channel.send({
                embeds: [new EmbedBuilder()
                    .setAuthor({ name: `Successfully Banned User`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
                    .setDescription(`**${client.emoji.users} User: [\`${member.user.tag}\`](https://discord.com/users/${user.id})
                        \n<a:admin:1426600691639783524> Ban By: ${message.author}
                        \n${client.emoji.time}Duration : ${time} [${formattedEndTime}]
                        \n<:anxExtra:1426619471681814528> Reason : ${reason}**`)]
            });

        } catch (e) {
            console.error(e);
            message.reply({
                embeds: [new EmbedBuilder().setDescription(`${client.emoji.cross} | An error occurred while executing the command.`)]
            });
        }
    },
};