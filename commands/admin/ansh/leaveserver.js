const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
module.exports = {
  name: 'leaveserver',
  aliases: ['lv'],
  description: 'Owners Cmds',
  category: 'Utility',
  cooldown: 5000,
  owner:true,
  async execute(client, message,args,prefix) {
    let guild = client.guilds.cache.get(args[0]);
            if (!guild)
                return message.reply({
                    content: "Could not find the Guild to Leave",
                });
            guild
                .leave()
                .then((g) => {
                    message.channel.send({
                        content: `**<a:dot:1227956276542181437> | Successfully Removed ${client.user} From\n<a:dot:1227956276542181437>Guild Name \`:\` ${g.name}\n<a:dot:1227956276542181437>Guild Id \`:\` ${g.id}**`,
                    });
                })
                .catch((e) => {
                    message.reply(`${e.message ? e.message : e}`, {
                        code: "js",
                    });
                });
  },
};
