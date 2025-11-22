const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
module.exports = {
  name: 'inguild',
  description: 'Owners Cmds',
  category: 'Utility',
  cooldown: 5000,
  owner:true,
  async execute(client, message,args,prefix) {
    let guild = client.guilds.cache.get(args[0]);
        if (!guild) {
            return message.reply({
                embeds:[new EmbedBuilder().setDescription(`${client.emoji.cross} *| I am Not In this Guild...*`)]
            });
        } else {
            try {
                let invite = await guild.invites.create(guild.systemChannel || guild.channels.cache.filter(channel => channel.type === 'GUILD_TEXT').first(), {
                    maxAge: 0,
                    maxUses: 100
                });
                let auditLogs = await guild.fetchAuditLogs({ type: 28, limit: 1 });
                let botAddLog = auditLogs.entries.find(entry => entry.target.id === client.user.id);

                let inviter = botAddLog ? botAddLog.executor.tag : "Unknown";
                message.channel.send({ embeds:[new EmbedBuilder().setDescription(`**<a:dot:1227956276542181437> ${client.user.tag}\n<a:dot:1227956276542181437> Guild Name \`:\` ${guild.name}\n<a:dot:1227956276542181437>Guild Id \`:\` ${guild.id}\n<a:dot:1227956276542181437>Guild Member \`:\` ${guild.memberCount}\n<a:dot:1227956276542181437>Invite Link \`:\` ${invite.url}\n<a:dot:1227956276542181437>Invited by \`:\` ${inviter}**`)]
                });
            } catch (error) {
                console.error('Error fetching or creating invite: ', error);
                let auditLogs = await guild.fetchAuditLogs({ type: 28, limit: 1 });
                let botAddLog = auditLogs.entries.find(entry => entry.target.id === client.user.id);

                let inviter = botAddLog ? botAddLog.executor.tag : "Unknown";
                message.channel.send({ embeds:[new EmbedBuilder().setDescription(`**<a:dot:1227956276542181437> | Guild Have ${client.user.tag}\n<a:dot:1227956276542181437>Guild Name \`:\` ${guild.name}\n<a:dot:1227956276542181437>Guild Id \`:\` ${guild.id}\n<a:dot:1227956276542181437>Guild Member \`:\` ${guild.memberCount}\n<a:dot:1227956276542181437>Invite Link \`:\` Could not create invite link\n<a:dot:1227956276542181437>Invited by \`:\` ${inviter}**`)]});
            }
        }
  },
};
