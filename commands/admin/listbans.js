const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
module.exports = {
  name: 'listban',
  aliases: ["banlist"],
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
    try{
    const users = await message.guild.bans.fetch().catch(() => { });
    let count= 0
    if (users.size > 0) {
        let roleList = '';

        users.forEach(member => {
            count++
            roleList += `**\`${count}.\` [\`${member.user.tag}\`](https://discord.com/users/${member.user.id}) - \`${member.user.id}\` • ${member.reason || "No reason provided"}**\n`;
        });
        const roleArray = roleList.split('\n'); // Convert roleList string to an array of lines
        if (roleArray.length > 10) {
            let page = 0;
            const totalPages = Math.ceil(roleArray.length / 10);

            const generateEmbed = () => {
                const start = page * 10;
                const end = Math.min((page + 1) * 10, roleArray.length);

                const embed = new EmbedBuilder()
                .setColor(process.env.color)
                .setAuthor({name: `List Of Banned users`, iconURL: message.guild.iconURL({dynamic : true})})
                .setTitle(`${client.emoji.admin}Total Banned  : \`${count}\``)
                .setDescription(`**<:Harmonia:1224417172319899841> Page : \`${page + 1}/${totalPages}\`**\n\n`+roleArray.slice(start, end).join('\n'))
                .setFooter({text: `Requested By ${message.author.tag}`, iconURL: message.author.displayAvatarURL()})
                return embed;
            };

            const embedMessage = await message.channel.send({ embeds: [generateEmbed()], components: [buildActionRow()] });

            const filter = i => i.user.id === message.author.id;
            const collector = message.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'previous' && page > 0) {
                    page--;
                } else if (i.customId === 'next' && page < totalPages - 1) {
                    page++;
                }else if (i.customId === 'del') {
                    embedMessage.delete()
                }

                await i.update({ embeds: [generateEmbed()] });
            });

            collector.on('end', () => {
                embedMessage.edit({ components: [] });
            });
        } else {
            const embed = new EmbedBuilder()
            .setColor(process.env.color)
            .setAuthor({name: `List Of Banned User`, iconURL: message.guild.iconURL({dynamic : true})})
            .setTitle(`${client.emoji.admin}Total Banned  : \`${count}\``)                
            .setDescription(roleList)
            .setFooter({text: `Requested By ${message.author.tag}`, iconURL: message.author.displayAvatarURL()})


            message.channel.send({ embeds: [embed] });
        }
    } else {
        message.channel.send('No User found in Ban List.');
    }
    } catch(e) { 
        if (e.code === 10062) {
            return 
        } else {
        console.error(e) }
    }
    
  
    function buildActionRow() {
        const previousButton = new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setCustomId('previous')
            .setEmoji(client.emoji.back)
        const del = new ButtonBuilder()
            .setStyle(ButtonStyle.Danger)
            .setCustomId('del')
            .setEmoji("<:delete:1426619613323460779>")
        const nextButton = new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setCustomId('next')
            .setEmoji(client.emoji.arrow)
    
        return new ActionRowBuilder()
            .addComponents(previousButton, del,nextButton);
    }
  },
};
