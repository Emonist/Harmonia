const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emoji = '../../emoji.json'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('developer')
    .setDescription('Check bot latency'),

  async execute(client, interaction) {
    const pingEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setDescription(`\n**__[ANSH | Owner of Harmonia](https://discord.com/users/1383706658315960330)__**\n\n\n${client.emoji.arrow} *Hello I am **__! Ansh .__** <@!1383706658315960330> (ANSH)\n\n${client.emoji.arrow}  I am very proud for all of my verified and not verified Discord Bots, but the Bot I am the most proud of is: **[Harmonia MUSIC](https://discord.com/api/oauth2/authorize?client_id=1409051024936669184&permissions=8&scope=applications.commands%20bot)** | 2023's Best Music Bot\n\n${client.emoji.arrow} I made this Bot, and you can get a free Bot too! Just go to: [My Server](https://discord.gg/devhaven).\n\n${client.emoji.arrow} Now you can visit to [**My Bot List**](https://ansh.carrd.co/) \n\n${client.emoji.arrow} I am also a Discord Server Creator\n\n${client.emoji.arrow}  Yeah i hope you like my stuff ✌ <3*`) 
      .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [pingEmbed] });
  },
};
