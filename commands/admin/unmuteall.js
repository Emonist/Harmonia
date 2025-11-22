const {
    EmbedBuilder,
    PermissionsBitField,
  } = require('discord.js');
  
  module.exports = {
    name: 'unmuteall',
    description: 'Unmute all timed-out members in the server',
    category: 'Moderation',
    cooldown: 5000,
  async execute(client, message,args,prefix) {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setAuthor({
                name: client.user.username,
                iconURL: client.user.displayAvatarURL(),
                url: 'https://discord.com/users/' + client.user.id,
              })
              .setTitle('❌ Permission Denied')
              .setDescription(
                'You need **Moderate Members** permission to use this command.',
              )
              .setFooter({
                text: `Requested by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL(),
              })
              .setTimestamp(),
          ],
        });
      }
  
      // Fetch all members in the guild
      await message.guild.members.fetch();
      const members = message.guild.members.cache;
  
      let count = 0;
  
      // Loop through all members and unmute those who are timed out
      members.forEach((member) => {
        if (member.isCommunicationDisabled() && member.moderatable) {
          member.timeout(null); // Remove the timeout
          count++;
        }
      });
  
      if (count === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500')
              .setDescription(
                'There are no currently timed-out members in this server.',
              )
          ],
        });
      }
  
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            
            .setDescription(
                `**${client.emoji.tick} | Sucessfully Unmuted all ${count} Members.**`,
              )
        ],
      });
    },
  };