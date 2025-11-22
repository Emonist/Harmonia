const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const ReactionRole = require("../../models/ReactionRole");
const { checkVote } = require('../../helpers/checkVote');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  name: "reactionrole",
  aliases: ["selfrole", 'self-role', 'reaction-role'],
  description: "Set up a reaction role message via reactions.",
  category: "Utility",
  cooldown: 5000,
  async execute(client, message, args, prefix) {
    // Vote check
    const hasVoted = await checkVote(client, message);
    if (!hasVoted) return;
    
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
      !process.env.BOT_OWNER?.includes(message.author.id)
    ) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(process.env.color || "#ff0000")
            .setAuthor({
              name: "| You are lacking permissions: Administrator",
              iconURL: message.author.displayAvatarURL({ dynamic: true }),
            }),
        ],
      });
    }

    if (!args[0]) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(process.env.color)
            .setDescription(
              `Usage: \`${prefix}reactionrole <#channel/show/delete/reset> <title>\``
            ),
        ],
      });
    }
    // ----- SHOW ALL PANELS -----
    if (args[0]?.toLowerCase() === "show") {
      const panels = await ReactionRole.find({ guildId: message.guild.id });
      if (!panels.length) {
        return message.channel.send({ embeds: [new EmbedBuilder().setDescription(`${client.emoji.cross} *\`|\`No reaction role panels found in this server.*`)] });
      }

      const embed = new EmbedBuilder()
        .setTitle("Reaction Role Panels")
        .setColor(process.env.color || "#00b0f4")
        .setDescription(
          panels.map((panel, idx) => {
            const channel = message.guild.channels.cache.get(panel.channelId);
            return `**${idx + 1}.** \`${panel.panelName}\` in ${channel ? `<#${channel.id}>` : 'deleted channel'} | [Jump](${channel ? `https://discord.com/channels/${message.guild.id}/${panel.channelId}/${panel.messageId}` : '#'})`;
          }).join("\n")
        );
      return message.channel.send({ embeds: [embed] });
    }

    // ----- REMOVE SINGLE PANEL BY INDEX -----
    if (args[0]?.toLowerCase() === "remove" || args[0]?.toLowerCase() === "delete") {
      const idx = parseInt(args[1]);
      if (isNaN(idx) || idx < 1) {
        return message.channel.send({ embeds: [new EmbedBuilder().setDescription(`**${client.emoji.cross} \`|\` Usage: \`${prefix}reactionrole remove 1\`** `)] });
      }
      const panels = await ReactionRole.find({ guildId: message.guild.id });
      if (idx > panels.length) {
        return message.channel.send(`${client.emoji.cross} **\`|\` There are only ${panels.length} panels.**`);
      }
      const panel = panels[idx - 1];
      // Try to delete the message in the channel if it exists
      try {
        const channel = await message.guild.channels.fetch(panel.channelId);
        if (channel) {
          const msg = await channel.messages.fetch(panel.messageId);
          if (msg) await msg.delete().catch(() => { });
        }
      } catch (e) { /* ignore errors */ }
      // Remove from DB
      await ReactionRole.deleteOne({ _id: panel._id });
      return message.channel.send({ embeds: [new EmbedBuilder().setDescription(`**${client.emoji.tick} \`|\` Removed panel \`${panel.panelName}\` from ReactionRole**`)] });
    }

    // ----- RESET ALL -----
    if (args[0]?.toLowerCase() === "reset") {
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_reset_rr")
          .setLabel("Confirm Reset")
          .setStyle(ButtonStyle.Danger)
      );
      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription("Are you sure you want to **reset all reaction roles** in this server? This action cannot be undone."),
        ],
        components: [confirmRow],
      });
      const filter = (i) => i.customId === "confirm_reset_rr" && i.user.id === message.author.id;
      try {
        const interaction = await message.channel.awaitMessageComponent({ filter, time: 30000 });
        // Optionally, delete all panel messages
        const rrList = await ReactionRole.find({ guildId: message.guild.id });
        for (const entry of rrList) {
          try {
            const ch = await message.guild.channels.fetch(entry.channelId);
            if (ch) {
              const msg = await ch.messages.fetch(entry.messageId);
              if (msg) await msg.delete().catch(() => { });
            }
          } catch (err) { }
        }
        const deleted = await ReactionRole.deleteMany({ guildId: message.guild.id });
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor("Green")
              .setDescription(`✅ All reaction roles have been reset (${deleted.deletedCount} panels removed).`),
          ],
          components: [],
        });
      } catch (err) {
        await message.channel.send("⏰ Reset timed out or was cancelled.");
      }
      return;
    }

    if (args.length < 1) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription(
              `Usage: \`${prefix}reactionrole <#channel> <title>\``
            ),
        ],
      });
    }

    const channel =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[0].replace(/\D/g, ""));
    if (!channel) return message.reply("Couldn't find the channel!");

    const title = args.slice(1).join(" ").replace(/"/g, "") || "Reaction Role";
    //const desc = args[2].replace(/"/g, "");

    let roleEmojiPairs = [];

    const askRole = async () => {
      await message.channel.send({ embeds: [new EmbedBuilder().setDescription(`Please mention a \`role\` to add, or type \`finish\` to complete`)] });
      const filter = (m) => m.author.id === message.author.id;
      const collectedRole = await message.channel.awaitMessages({ filter, max: 1, time: 60000 });
      const roleContent = collectedRole.first()?.content?.trim();

      if (!roleContent || roleContent.toLowerCase() === "finish") return "finish";

      let role =
        collectedRole.first().mentions.roles.first() ||
        message.guild.roles.cache.get(roleContent.replace(/\D/g, ""));
      if (!role) {
        await message.channel.send("Invalid role. Please try again.");
        return askRole();
      }

      await message.channel.send({ embeds: [new EmbedBuilder().setDescription(`**Now send the emoji for \`${role.name}\` :**`)] })
      const collectedEmoji = await message.channel.awaitMessages({ filter, max: 1, time: 60000 });
      const emoji = collectedEmoji.first()?.content?.trim();
      if (!emoji) {
        await message.channel.send("No emoji provided. Please try again.");
        return askRole();
      }

      // Prevent duplicates
      if (roleEmojiPairs.find((e) => e.role.id === role.id || e.emoji === emoji)) {
        await message.channel.send("Duplicate role or emoji. Please try again.");
        return askRole();
      }

      roleEmojiPairs.push({ role, emoji });
      return askRole();
    };

    await askRole();

    if (!roleEmojiPairs.length)
      return message.channel.send("No roles were set. Cancelled.");

    // Build embed description
    let embedDesc = "";
    for (const pair of roleEmojiPairs) {
      embedDesc += `** <a:stolen_emoji_or_sticker:1426093099326771241>  <@&${pair.role.id}> <a:arrow_arrow:1426600204295209091> ${pair.emoji} ﹒﹒  ♡..!!**\n\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription("\n" + embedDesc)
      .setColor(process.env.color || "#00b0f4");

    // Send the embed
    const embedMsg = await channel.send({ embeds: [embed] });
    const panelName = `rr-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    // Add reactions with a delay to avoid rate limits (400ms between each)
    for (const pair of roleEmojiPairs) {
      try {
        await embedMsg.react(pair.emoji);
        await wait(400); // 400ms delay between reactions
      } catch (err) {
        await message.channel.send(`Failed to react with ${pair.emoji}, skipping.`);
      }
    }

    // Save to DB
    await ReactionRole.create({
      guildId: message.guild.id,
      channelId: channel.id,
      messageId: embedMsg.id,
      roles: roleEmojiPairs.map((pair) => ({
        roleId: pair.role.id,
        emoji: pair.emoji,
      })),
      panelName,
      createdBy: message.author.id,
    });

    message.reply(`Reaction role message sent to ${channel}`);
  },
};