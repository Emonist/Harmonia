const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  async execute(client, interaction) {
    const pingEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🏓 Pong!')
      .setDescription(`📶 **Latency:** \`${client.ws.ping}ms\``)
      .setAuthor({
        name: client.user.username,
        iconURL: client.user.displayAvatarURL(),
        url: `https://discord.com/users/${client.user.id}`,
      })
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [pingEmbed] });
  },
};
