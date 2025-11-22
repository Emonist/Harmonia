const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
module.exports = {
  name: 'dm',
  description: 'Owners Cmds',
  category: 'Utility',
  cooldown: 5000,
  owner:true,
  execute(client, message,args,prefix) {
    let user = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!user)
      return message.channel.send({ embeds:[new EmbedBuilder()
        .setColor(process.env.color)
        .setDescription(`You did not mention a user, or you gave an invalid id`)]});
    if (!args.slice(1).join(" "))
      return message.channel.send({ embeds:[new EmbedBuilder()
        .setColor(process.env.color)
        .setDescription(`You did not specify your message`)]});
    user.user
      .send(args.slice(1).join(" "))
      .catch(() => message.channel.send({ embeds:[new EmbedBuilder()
        .setColor(process.env.color)
        .setDescription(`That user could not be DM!`)]}))
      .then(() => message.channel.send({ embeds:[new EmbedBuilder()
        .setColor(process.env.color)
        .setDescription(`**Sent a message to ${user.user}**`)]}));
  },
};
