const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
module.exports = {
  name: 'restartbot',
  aliases: ['rebootbot'],
  description: 'Owners Cmds',
  category: 'Utility',
  cooldown: 5000,
  owner:true,
  async execute(client, message,args,prefix) {
const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_restart")
        .setLabel("✅ Confirm")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancel_restart")
        .setLabel("❌ Cancel")
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor("#FFA500")
      .setTitle("⚠ Confirm Restart")
      .setDescription(
        "Are you sure you want to restart the bot?\n\n**This will disconnect the bot for a few seconds.**"
      )
      .setFooter({ text: `Requested by ${message.author.tag}` })
      .setTimestamp();

    const msg = await message.reply({ embeds: [embed], components: [row] });

    // ✅ Button Collector
    const filter = (i) =>
      ["confirm_restart", "cancel_restart"].includes(i.customId) &&
      i.user.id === message.author.id;

    const collector = msg.createMessageComponentCollector({
      filter,
      time: 15000, // 15 seconds
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "cancel_restart") {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor("#00FF00")
              .setDescription("✅ | Restart cancelled."),
          ],
          components: [],
        });
        collector.stop("cancelled");
      }

      if (interaction.customId === "confirm_restart") {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setDescription("♻ | Restarting the bot in **3 seconds**..."),
          ],
          components: [],
        });

        // ✅ Save restart timestamp
        client.lastRestart = Date.now();

        // ✅ Restart after 3 seconds
        setTimeout(() => {
          process.exit(0); // PM2 will restart the process
        }, 3000);
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor("#FF0000")
              .setDescription("⌛ | Restart request timed out."),
          ],
          components: [],
        });
      }
    });  
}
};
