const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const VanityConfig = require('../../models/VanityConfig'); // Adjust path as needed

module.exports = {
  name: 'vanityrole',
  aliases: ['vrole'],
  description: 'Manage vanity status rewards (add/rem/show/reset)',
  category: 'Utility',
  cooldown: 5000,
  async execute(client, message, args, prefix) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("You do not have permission to use this command.");
    }

    const subcommand = args[0]?.toLowerCase();
    if (!subcommand || !["add", "rem", "remove", "show", "reset"].includes(subcommand)) {
      const em= new EmbedBuilder()
          .setColor(process.env.color)
          .setAuthor({
              name: message.author.tag,
              iconURL: message.author.displayAvatarURL({ dynamic: true })
          })
          .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .addFields([
          { name: `\`add\``, value: `**Add a Vanity role trigger**` },
          {
              name: `\`remove\``,
              value: `**Remove a Vanity role trigger**`
          },
          {
              name: `\`show\``,
              value: `**List all Vanity role triggers**`
          },
          {
              name: `\`reset\``,
              value: `**Here You Can Reset all data of VanityRole**`
          }
      ])
      return message.channel.send({embeds:[em]});
    }

    // add <vanity> <role>
    if (subcommand === "add") {
      if (args.length !== 3) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder().setDescription(`Usage: \`${prefix}vanityrole add <vanity> <@role|roleID>\``)
        ]
      });
    }
      const vanity = args[1];
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
      if (!vanity || !role) {
        return message.reply(`Usage: \`${prefix}vanityrole add <vanity> <@role|roleID>\``);
      }

      let config = await VanityConfig.findOne({ guildId: message.guild.id });
      if (!config) config = new VanityConfig({ guildId: message.guild.id, vanities: [] });

      if (config.vanities.some(v => v.vanity === vanity)) {
        return message.reply(`**${client.emoji.cross} \`|\` That vanity is already set.**`);
      }

      config.vanities.push({ vanity, role: role.id });
      await config.save();
      return message.reply(`**${client.emoji.tick} \`|\` Vanity \`${vanity}\` is now linked to role ${role}.**`);
    }

    // rem <vanity>
    if (subcommand === "rem" || subcommand==="remove") {
      const vanity = args[1];
      if (!vanity) return message.reply(`Usage: \`${prefix}vanityrole rem <vanity>\``);

      let config = await VanityConfig.findOne({ guildId: message.guild.id });
      if (!config || !config.vanities.some(v => v.vanity === vanity)) {
        return message.reply(`**${client.emoji.cross} \`|\` That vanity is Not set as VanityRole.**`);
      }
      config.vanities = config.vanities.filter(v => v.vanity !== vanity);
      await config.save();
      return message.channel.send({embeds:[new EmbedBuilder().setDescription(`**${client.emoji.tick} \`|\` Vanity \`${vanity}\` has been removed.**`)]});
    }

    // show
    if (subcommand === "show") {
      let config = await VanityConfig.findOne({ guildId: message.guild.id });
      if (!config || config.vanities.length === 0) {
        return message.reply(`**${client.emoji.cross} \`|\` No vanity roles set.**`);
      }
      const embed = new EmbedBuilder()
        .setTitle("Vanity Roles")
        .setColor("#2b2d31")
        .setDescription(
          config.vanities
            .map(v => `\`${v.vanity}\` => <@&${v.role}>`)
            .join("\n")
        );
      return message.reply({ embeds: [embed] });
    }

    // reset
    if (subcommand === "reset") {
      let config = await VanityConfig.findOne({ guildId: message.guild.id });
      if (!config) return message.reply(`**${client.emoji.cross} \`|\` No vanity roles set.**`);
      config.vanities = [];
      await config.save();
      return message.channel.send({embeds:[new EmbedBuilder().setDescription(`**${client.emoji.tick} \`|\` All vanity roles have been reset.**`)]});
    }
  },
};