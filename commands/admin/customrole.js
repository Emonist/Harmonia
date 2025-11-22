const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder,ComponentType } = require("discord.js");
const CustomRole = require('../../models/CustomRole');
const { checkVote } = require('../../helpers/checkVote');

module.exports = {
  name: 'customrole',
  aliases: ['cr'],
  description: 'Admins Commands',
  category: 'Utility',
  cooldown: 5000,
  async execute(client, message,args,prefix) {
    // Vote check
    const hasVoted = await checkVote(client, message);
    if (!hasVoted) return;
    
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
    const subcommand = args.length > 0 ? args.shift().toLowerCase() : null;

    if (!subcommand) {
        const em= new EmbedBuilder()
        .setColor(process.env.color)
    .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
    })
    .setThumbnail(message.guild.iconURL({ dynamic: true }))
.addFields([
    { name: `\`add\``, value: `**Add a custom role trigger**` },
    {
        name: `\`remove\``,
        value: `**Remove a custom role trigger**`
    },
    {
        name: `\`list\``,
        value: `**List all custom role triggers**`
    },
    {
        name: `\`manager\``,
        value: `**Set a manager role for a custom role trigger**`
    },
    {
        name: `\`reset\``,
        value: `**Here You Can Reset all data of Customrole**`
    }
])
        return message.channel.send({embeds:[em]});
    }
const guildId = message.guild.id;
if (!message.guild.members.me?.permissions?.has(PermissionsBitField.Flags.ManageRoles)) {
    const errorEmbed = new EmbedBuilder()
        .setColor(process.env.color)
        .setDescription('<a:cross_cross:1426599580430237760> I need the `Manage Roles` permission to set custom roles!');
    return message.reply({ embeds: [errorEmbed] });
}

switch (subcommand) {
    case 'add': {
        if (args.length < 2) {
            const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> Usage: `,setupcustomrole add <trigger> <@role/roleID>`');
                return message.reply({ embeds: [errorEmbed] });
        }

        const trigger = args[0];
        const roleInput = args[1].replace(/[<@&>]/g, '');
        const role = message.guild.roles.cache.get(roleInput);

        if (!role) {
            const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> Invalid role specified!')
                .setTimestamp();
            return message.reply({ embeds: [errorEmbed] });
        }

        if (role.position >= message.member.roles.highest.position) {
            const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> You cannot set a role that is higher than or equal to your highest role!')
                .setTimestamp();
            return message.reply({ embeds: [errorEmbed] });
        }

        const existingTrigger = await CustomRole.findOne({ guildId, trigger });
        if (existingTrigger) {
            const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> This trigger already exists!')
                .setTimestamp();
            return message.reply({ embeds: [errorEmbed] });
        }

        await CustomRole.create({ guildId, trigger, roleId: role.id });

        const successEmbed = new EmbedBuilder()
            .setColor(process.env.color)
            .setTitle('Custom Role Trigger Added')
            .setDescription(`**Trigger:** ${trigger}\n**Role:** ${role}`)
            .setTimestamp();
        return message.channel.send({ embeds: [successEmbed] });
    }

    case 'remove': {
        if (!args.length) {
            const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> Usage: `,setupcustomrole remove <trigger>`');
            return message.reply({ embeds: [errorEmbed] });
        }

        const trigger = args[0];
        const result = await CustomRole.findOneAndDelete({ guildId, trigger });

        if (result) {
            const successEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setTitle('Custom Role Trigger Removed')
                .setDescription(`**Trigger:** ${trigger}`)
                .setTimestamp();
            return message.channel.send({ embeds: [successEmbed] });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> No custom role trigger found with that name!')
                .setTimestamp();
            return message.reply({ embeds: [errorEmbed] });
        }
    }
    case 'list': {
        const itemsPerPage = 5;
        const customRoles = await CustomRole.find({ guildId });
        const totalPages = Math.ceil(customRoles.length / itemsPerPage);
        let currentPage = 0;
        const managerData = await client.data?.get(`customrole_${guildId}`);
        const managerRoleId = managerData?.reqrole || null;
        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const pageItems = customRoles.slice(start, end);

            const embed = new EmbedBuilder()
                .setColor(process.env.color)
                .setTitle('Custom Role Triggers')
                .setTimestamp();

                if (managerRoleId) {
                    const managerRole = message.guild.roles.cache.get(managerRoleId);
                    embed.addFields({
                        name: 'Manager Role',
                        value: managerRole ? `<@&${managerRoleId}>` : `Role not found (${managerRoleId})`,
                        inline: false
                    });
                }

            if (pageItems.length === 0) {
                embed.setDescription('No custom role triggers found.');
            } else {
                const description = pageItems.map((item, index) => {
                    const role = message.guild.roles.cache.get(item.roleId);
                    return `**${start + index + 1}.** \`${item.trigger}\` → ${role ? role : 'Role not found'}`;
                }).join('\n');

                embed.setDescription(description);
                
            }

            embed.setFooter({ text: `Page ${page + 1} of ${totalPages}` });
            return embed;
        };

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setEmoji("<:arrow_left:1426600560500674680>")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('cancel')
                    .setEmoji("<a:cross_cross:1426599580430237760>")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setEmoji("<a:arrow_arrow:1426600204295209091>")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(totalPages <= 1)
            );

        const messageEmbed = await message.channel.send({
            embeds: [generateEmbed(currentPage)],
            components: [actionRow]
        });

        const collector = messageEmbed.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({
                    content: 'This pagination is not for you!',
                    ephemeral: true
                });
            }

            switch (interaction.customId) {
                case 'prev':
                    currentPage = currentPage > 0 ? --currentPage : totalPages - 1;
                    break;
                case 'next':
                    currentPage = currentPage + 1 < totalPages ? ++currentPage : 0;
                    break;
                case 'cancel':
                    collector.stop();
                    return;
            }

            const newActionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setEmoji("<:arrow_left:1426600560500674680>")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('cancel')
                        .setEmoji("<a:cross_cross:1426599580430237760>")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setEmoji("<a:arrow_arrow:1426600204295209091>")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(currentPage === totalPages - 1)
                );

            await interaction.update({
                embeds: [generateEmbed(currentPage)],
                components: [newActionRow]
            });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setEmoji("<:arrow_left:1426600560500674680>")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('cancel')
                        .setEmoji("<a:cross_cross:1426599580430237760>")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setEmoji("<a:arrow_arrow:1426600204295209091>")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );

            messageEmbed.edit({ components: [disabledRow] }).catch(() => {});
        });
        break;
    }

    case 'manager': {
        if (args.length < 1) {
            const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> Usage: `,setupcustomrole manager @role`');
            return message.reply({ embeds: [errorEmbed] });
        }
        const roleInput = args[0].replace(/[<@&>]/g, '');
        const role = message.guild.roles.cache.get(roleInput);

        if (!role) {
            const errorEmbed = new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription('<a:cross_cross:1426599580430237760> Invalid role specified!')
                .setTimestamp();
            return message.reply({ embeds: [errorEmbed] });
        }
        await client.data?.set(`customrole_${message.guild.id}`, {
            reqrole: role.id
        })

        const successEmbed = new EmbedBuilder()
            .setColor(process.env.color)
            .setTitle('Manager Role Set')
            .setDescription(`**Manager Role:** ${role}`)
            .setTimestamp();
        return message.channel.send({ embeds: [successEmbed] });
    }
    case 'reset':{
        let b1 = new ButtonBuilder().setStyle(ButtonStyle.Success).setCustomId(`m1`).setEmoji(client.emoji.tick).setLabel(`Confirm`)
        let b2 = new ButtonBuilder().setStyle(ButtonStyle.Danger).setCustomId(`m2`).setEmoji(client.emoji.cross).setLabel(`Cancle`)
        let em1 = new EmbedBuilder().setColor(process.env.color).setDescription(`**Do you want to \`Reset\` Custome roles.?**`);
        let ro3 = new ActionRowBuilder().addComponents(b1,b2);
        let msg = await message.channel.send({embeds : [em1],components : [ro3]});
        let call = await msg.createMessageComponentCollector({
            filter:(o) =>{
                if(o.user.id === message.author.id) return true;
                        else{
                            return o.reply({content : `${client.emoji.cross} | This is not your session run ${prefix}customrole reset instead.`,ephemeral : true})
                        }
                    },
                        //time : 50000,
                    });
                    call.on('collect',async(int) => {
                        if(int.isButton())
                        {
                            if(int.customId === `m1`)
                            {
                                await CustomRole.deleteMany({ guildId });
                                await client.data?.delete(`customrole_${guildId}`);
                                const successEmbed = new EmbedBuilder()
                                .setColor(0x00FF00)
                                .setDescription('✅ All custom role triggers and manager role have been reset successfully.');
                                await int.update({ embeds: [successEmbed],components:[] });
                            }
                          
                            }
                            if(int.customId === `m2`)
                            {
                                return msg.delete().then(
                                    message.delete()
                                )
                            }
                    })
              
    }
}
  },
};
