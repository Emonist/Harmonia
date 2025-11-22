const { EmbedBuilder, PermissionsBitField, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
  name: 'inrole',
  aliases: [],
  description: 'List members with a specific role',
  category: 'Utility',
  cooldown: 5000,
  async execute(client, message, args, prefix) {
    // Permission check
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
    
    // Check if role was provided
    if (!args[0]) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(process.env.color)
            .setDescription(`${client.emoji.cross} | Command Usage: \`${prefix}inrole @role\``)
        ]
      });
    }
    
    // Let user know we're fetching data
    const loadingMsg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(process.env.color)
          .setDescription(`${client.emoji.loading} | Fetching role information, please wait...`)
      ]
    });
    
    try {
      // Improved role parsing
      const roleInput = args.join(' ');
      let role = null;
      
      // Try different methods to find the role
      if (message.mentions.roles.first()) {
        role = message.mentions.roles.first();
      } else if (/^\d{17,19}$/.test(roleInput)) {
        role = await message.guild.roles.fetch(roleInput).catch(() => null);
      } else {
        // Search for role by name (case insensitive)
        const roles = await message.guild.roles.fetch();
        role = roles.find(r => 
          r.name.toLowerCase() === roleInput.toLowerCase() ||
          r.name.toLowerCase().includes(roleInput.toLowerCase())
        );
      }
      
      // Role not found
      if (!role) {
        await loadingMsg.delete();
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(process.env.color)
              .setDescription(`**Role not found.** Please check if the role name is correct.`)
              .addFields({
                name: 'Troubleshooting',
                value: `• Make sure you mention the role: ${prefix}inrole @rolename\n• Or use the exact role name in quotes if it contains special characters`
              })
          ]
        });
      }
      
      // DEBUG: Check if we found the right role
      //console.log(`Role found: ${role.name} (ID: ${role.id})`);
      
      // Fetch ALL members with this role (force API call)
      const members = await message.guild.members.fetch();
      const membersWithRole = members.filter(member => 
        member.roles.cache.has(role.id)
      );
      
      const count = membersWithRole.size;
      //console.log(`Members with role ${role.name}: ${count}`);
      
      // Create member list
      const memberTags = Array.from(membersWithRole.values()).map((member, index) => {
        return `\`${index + 1}.\` **[\`${member.user.tag}\`](https://discord.com/users/${member.user.id}) - \`${member.user.id}\`**`;
      });
      
      // Delete loading message
      await loadingMsg.delete();
      
      // If no members found but we know there should be
      if (count === 0) {
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(process.env.color || 'Orange')
              .setAuthor({ 
                name: `Role Members Debug`, 
                iconURL: message.guild.iconURL({ dynamic: true }) 
              })
              .setTitle(`${client.emoji?.users || '👥'} Role: ${role.name}`)
              .setDescription(`The bot cannot find members with the **${role.name}** role.`)
              .addFields(
                {
                  name: 'Possible Solutions',
                  value: '1. Enable "SERVER MEMBERS INTENT" in Discord Developer Portal\n2. Ensure the bot has "Manage Roles" permission\n3. Try again in a few moments'
                },
                {
                  name: 'Role Info',
                  value: `ID: ${role.id}\nPosition: ${role.position}\nColor: ${role.hexColor}`
                }
              )
              .setFooter({ 
                text: `If this persists, check your bot's privileged intents`, 
                iconURL: message.author.displayAvatarURL() 
              })
          ]
        });
      }
      
      // Handle pagination if more than 10 members
      if (memberTags.length > 10) {
        let page = 0;
        const totalPages = Math.ceil(memberTags.length / 10);
        
        const generateEmbed = () => {
          const start = page * 10;
          const end = Math.min((page + 1) * 10, memberTags.length);
          
          return new EmbedBuilder()
            .setColor(role.color || process.env.color || 'Random')
            .setAuthor({ 
              name: `Members in Role: ${role.name}`, 
              iconURL: message.guild.iconURL({ dynamic: true }) 
            })
            .setTitle(`${client.emoji?.users || '👥'} Total: ${count} members`)
            .setDescription(`**Page: \`${page + 1}/${totalPages}\`**\n\n${memberTags.slice(start, end).join('\n')}`)
            .setFooter({ 
              text: `Requested by ${message.author.tag}`, 
              iconURL: message.author.displayAvatarURL() 
            });
        };
        
        const embedMessage = await message.channel.send({ 
          embeds: [generateEmbed()], 
          components: [buildActionRow()] 
        });
        
        const filter = interaction => {
          return ['previous', 'del', 'next'].includes(interaction.customId) && 
                 interaction.user.id === message.author.id;
        };
        
        const collector = embedMessage.createMessageComponentCollector({ filter, time: 90000 });
        
        collector.on('collect', async interaction => {
          if (interaction.customId === 'previous') {
            page = Math.max(0, page - 1);
          } else if (interaction.customId === 'del') {
            await embedMessage.delete();
            collector.stop();
            return;
          } else if (interaction.customId === 'next') {
            page = Math.min(totalPages - 1, page + 1);
          }
          
          await interaction.update({ embeds: [generateEmbed()] });
        });
        
        collector.on('end', () => {
          if (!embedMessage.deleted) {
            embedMessage.edit({ 
              content: `This menu has expired`, 
              components: [] 
            }).catch(() => {});
          }
        });
      } else {
        // For 10 or fewer members
        message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(role.color || process.env.color || 'Random')
              .setAuthor({ 
                name: `Members in Role: ${role.name}`, 
                iconURL: message.guild.iconURL({ dynamic: true }) 
              })
              .setTitle(`${client.emoji?.users || '👥'} Total: ${count} members`)
              .setDescription(memberTags.join('\n'))
              .setFooter({ 
                text: `Requested by ${message.author.tag}`, 
                iconURL: message.author.displayAvatarURL() 
              })
          ]
        });
      }
    } catch (error) {
      console.error('Error in inrole command:', error);
      await loadingMsg.delete();
      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(process.env.color || 'Red')
            .setDescription('An error occurred while processing your request.')
            .addFields({
              name: 'Error Details',
              value: `\`\`\`${error.message}\`\`\``
            })
        ]
      });
    }
    
    function buildActionRow() {
      const previousButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setCustomId('previous')
        .setEmoji(client.emoji?.back || '◀️')
        .setLabel('Previous');
      
      const delButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setCustomId('del')
        .setEmoji(client.emoji?.delete || '🗑️')
        .setLabel('Delete');
      
      const nextButton = new ButtonBuilder()
        .setStyle(ButtonStyle.Primary)
        .setCustomId('next')
        .setEmoji(client.emoji?.arrow || '▶️')
        .setLabel('Next');
      
      return new ActionRowBuilder()
        .addComponents(previousButton, delButton, nextButton);
    }
  },
};