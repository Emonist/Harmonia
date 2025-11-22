const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
module.exports = {
  name: 'roleicon',
  aliases: [],
  description: 'Admins Commands',
  category: 'Utility',
  cooldown: 5000,
  async execute(client, message,args,prefix) {
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
    if(!args[0]){
        return message.channel.send({embeds:[new EmbedBuilder().setDescription(`**${client.emoji.cross} | Usage: \`${prefix}roleicon @role <emoji>\`**`)]})
    }
    const roleId = message.content.split(' ')[1].replace(/<@&|>/g, '');
           let roleMention = message.mentions.roles.first() ||
              message.guild.roles.cache.get(roleId)
            let emoji = args[1]
            const serverBoosts = message.guild.premiumSubscriptionCount; // Gets the number of boosts for the server
            if (serverBoosts < 7) {
                // Send a message prompting users to boost the server
                message.channel.send({embeds:[new EmbedBuilder().setDescription(`${client.emoji.cross} | **Please complete 7x boost the server to unlock this feature!**`)]});
                return;
            }
            if(!emoji){
                await roleMention.edit({ icon: null });
                return message.channel.send({embeds:[new EmbedBuilder().setDescription(`**${client.emoji.tick} | Role Emoji Reset**`)]})
            }
            if(emoji.startsWith("<") && emoji.endsWith(">")) {
                const id = emoji.match(/\d{15,}/g)[0]
                emoji = `https://cdn.discordapp.com/emojis/${id}.png`
            }
            if (!roleMention) {
                return message.reply({embeds:[new EmbedBuilder().setDescription(`**${client.emoji.cross} | Usage: \`roleicon @role <emoji>\`**`)]});
            }
            

            try {
                await roleMention.edit({ icon: emoji });
                message.channel.send({embeds:[new EmbedBuilder().setDescription(`**${client.emoji.tick} | Successfully updated the role icon of ${roleMention}role to [\`New Icon Url.\`](${emoji})**`)]})
            } catch (error) {
                if (error.code === 50101) {
                    return message.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(process.env.color)
                                .setDescription(`**${client.emoji.cross} | This server needs more boosts to use role icons (Level 2 required).**`)
                        ]
                    });
                }

                console.error(error);
                message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`**${client.emoji.cross} | Emoji not found, Please provide a valid \`emoji\` or an \`emoji ID\`.**`)
                    ]
                });
            }
  },
};
