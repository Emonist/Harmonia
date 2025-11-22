const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const TempRole = require('../../models/temprole');
module.exports = {
    name: 'temprole',
    aliases: [],
    description: 'Admins Commands',
    category: 'Utility',
    cooldown: 5000,
      async execute(client, message, args,prefix) {
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
            let user = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
            if (!user) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor(`#fcf707`)
                        .setDescription(`${client.emoji.cross} | Command Usage : \`${prefix}temprole <sec/min/hour/day> @user @role\``)]
                });
            }

            const roleName = args.slice(2).join(' ');
            const mention = message.mentions.roles.first();
            const role = message.guild.roles.cache.find((r) => r.name === roleName || r.id === roleName || r === mention);
            
            if (!role) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setDescription(`${client.emoji.cross} | Usage : \`${prefix}temprole <sec/min/hour/day> @user @role \``)]
                });
            }

            const time = args[0];
            const timeRegex = /^(\d+)(s|sec|second|seconds|min|m|minutes|minute|hour|hr|hours|h|d|days|day|mon|month|months)$/;
            const timeMatch = time.match(timeRegex);
            
            if (!timeMatch) {
                return message.reply({
                    embeds: [new EmbedBuilder()
                        .setDescription(`${client.emoji.cross} | Usage : \`${prefix}temprole <sec/min/hour/day> @user @role \``)]
                });
            }

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
                        embeds: [new EmbedBuilder()
                            .setDescription(`${client.emoji.cross} | Invalid time format`)]
                    });
            }

            const member = message.guild.members.cache.get(user.id);
            let msg = await message.channel.send({
                embeds: [new EmbedBuilder()
                    .setDescription(`**<a:loading:1426621893464817666> | Assigning Temporary Role to ${user} for ${time}**`)]
            });

            // Check role hierarchy
            const memberPosition = member.roles.highest.position;
            const moderationPosition = message.member.roles.highest.position;
            if (moderationPosition <= memberPosition) {
                return msg.edit({
                    embeds: [new EmbedBuilder()
                        .setDescription(`**${client.emoji.cross} \`|\` I cannot add/remove role someone, who is above/equal you.**`)]
                });
            }

            if (message.member.roles.highest.position <= role.position) {
                return msg.edit({
                    embeds: [new EmbedBuilder()
                        .setDescription(`**${client.emoji.cross} \`|\` I cannot give that Role to this Member, because it's higher then your highest ROLE!**`)]
                });
            }

            if (!member.manageable) {
                return msg.edit({
                    embeds: [new EmbedBuilder()
                        .setColor(process.env.color)
                        .setDescription(`**${client.emoji.cross} \`|\` I cannot give that Role to this Member, because he is higher/Equal to My Rang Position!**`)]
                });
            }

            const expireAt = new Date(Date.now() + milliseconds);
            
            // Create temp role entry in database
            const tempRole = new TempRole({
                guildId: message.guild.id,
                userId: member.id,
                roleId: role.id,
                moderatorId: message.author.id,
                expireAt: expireAt,
                duration: time
            });

            await tempRole.save();

            // Add the role
            await member.roles.add(role);
            
            const formattedEndTime = `<t:${Math.floor(expireAt.getTime() / 1000)}:R>`;
            
            msg.edit({
                embeds: [new EmbedBuilder()
                    .setAuthor({
                        name: `Successfully Assigned Temp Role`,
                        iconURL: member.user.displayAvatarURL({ dynamic: true })
                    })
                    .setDescription(`**${client.emoji.users} User: [\`${member.user.tag}\`](https://discord.com/users/${member.user.id})
                        \n${client.emoji.admin} Role: ${role}
                        \n${client.emoji.time} Duration : ${time} [${formattedEndTime}]**`)]
            });

        } catch (e) {
            console.error(e);
            message.reply({
                embeds: [new EmbedBuilder()
                    .setDescription(`${client.emoji.cross} | An error occurred while executing the command.`)]
            });
        }
    },
};