const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
module.exports = {
  name: 'test',
  aliases: [],
  description: 'Admins Commands',
  category: 'Utility',
  cooldown: 5000,
  execute(client, message,args,prefix) {
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
    message.channel.send(`${args[0]}/n${args[1]}/n${args[2]}/n${args[3]}/n${args[4]}`)
  },
};
