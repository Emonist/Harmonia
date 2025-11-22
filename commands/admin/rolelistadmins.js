const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
module.exports = {
  name: 'rolelistadmin',
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
    const adminRoles = message.guild.roles.cache.filter(role => role.permissions.has(PermissionsBitField.Flags.Administrator));
            if (adminRoles.size === 0) {
                message.channel.send('There are no role with Administrator permission.');
            }
        let count=0;

        const memberTags = adminRoles.map(role =>{
            count++;
            return `\`${count}.\` **[\`${role.name}\`](https://discord.gg/devhaven) [\`${role.id}\`] - \`${role.members.size}\` Members**`
            })
            
        //message.channel.send(`Members in role ${role.name}: ${membersWithRole.join(', ')}`);
        if (memberTags.length > 10) {
        let page = 0;
        const totalPages = Math.ceil(memberTags.length / 10);

        const generateEmbed = () => {
            const start = page * 10;
            const end = Math.min((page + 1) * 10, memberTags.length);
                
                return new EmbedBuilder()
                    .setColor(process.env.color)
                    .setAuthor({name: `List Of Members In A Admin`, iconURL: message.guild.iconURL({dynamic : true})})
                    .setTitle(`${client.emoji.users}Members With Perms - \`Admin\`  : \`${count}\``)
                    .setDescription(`**<:Harmonia:1224417172319899841> Page : \`${page + 1}/${totalPages}\`**\n\n${memberTags.slice(start, end).join('\n')}`)
                    .setFooter({text: `Requested By ${message.author.tag}`, iconURL: message.author.displayAvatarURL()})

            };
            const embedMessage = await message.channel.send({ embeds: [generateEmbed()], components: [buildActionRow()] });

            const filter = interaction => {
                return ['previous', 'del','next'].includes(interaction.customId) && interaction.user.id === message.author.id;
            };

            const collector = embedMessage.createMessageComponentCollector({ filter, time: 90000 });

            collector.on('collect', async interaction => {
                if (interaction.customId === 'previous') {
                    page = Math.max(0, page - 1);
                }else if (interaction.customId === 'del') {
                    embedMessage.delete();
                    collector.stop();
                }
                 else if (interaction.customId === 'next') {
                    page = Math.min(totalPages - 1, page + 1);
                }

                await interaction.update({ embeds: [generateEmbed()] });
            });

            collector.on('end', () => {

                embedMessage.edit({content:`This Menu Is Expired`, components: [] });
            });
        } else {
            // If there are less than or equal to 10 members, no need for pagination
            message.channel.send({embeds:[new EmbedBuilder().setAuthor({name: `List Of Members In A Admin`, iconURL: message.guild.iconURL({dynamic : true})}).setTitle(`${client.emoji.users}Members With Perms - \`Admin\`  : \`${count}\``).setDescription(`${memberTags.join('\n')}`)]})
            

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
