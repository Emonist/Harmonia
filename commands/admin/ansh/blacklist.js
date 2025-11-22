const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
module.exports = {
  name: 'blacklist',
  aliases: ['bl'],
  description: 'Provides an avatar of bots',
  category: 'Utility',
  cooldown: 5000,
  owner:true,
  async execute(client, message,args,prefix) {
    let user = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
      if(!args[0])
      {
          return message.channel.send({embeds : [new EmbedBuilder().setColor(`#fcf707`).setDescription(`${client.emoji.cross} | Command Usage : \`${prefix}blacklist <add/remove/show> @user\``)]})
      }
      let db = await client.data.get(`blacklist_${client.user.id}`);
      if(!db || db === null) await client.data.set(`blacklist_${client.user.id}`,[])

      let bl = [];
      db.forEach(x => bl.push(x));

      let opt = args[0].toLowerCase();
      if (!opt === `add` || !opt === `remove` || !opt === `show` || !opt === `list`){
        return message.channel.send({embeds : [new EmbedBuilder().setColor(`#fcf707`).setDescription(`${client.emoji.cross} | Command Usage : \`${prefix}blacklist <add/remove/show> @user\``)]})
      }
      let reason = args.slice(1).join(' ');
      if(!reason) reason = `No Reason Provided`;

      if(opt === `add`)
      {
          if(!user) return message.channel.send({embeds : [new EmbedBuilder().setColor(`#fcf707`).setDescription(`${client.emoji.cross} | Please provde me a valid user.`)]});
          bl.push(user.id);
          await client.data.set(`blacklist_${client.user.id}`,bl);
          await client.data.set(`blreason_${user.id}`,reason);
          message.channel.send({embeds : [new EmbedBuilder().setColor(`#fcf707`).setDescription(`**${client.emoji.tick} | SuccessFully Added ${user} to my \`Blacklist\`**`)]})
          let db = await client.data.get(`noprefix_${client.user.id}`);
          if (!db || db === null) client.data.set(`noprefix_${client.user.id}`, [])
          let um = [];
          db.forEach(x => um.push(x));
          if (!um.includes(user.id)) {
            return 
            //message.channel.send({ embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`**${client.emoji.tick} \`|\` This user is not present in my \`Non-prefix\`**`)] })
          }
          else {
            let bhai = um.filter(x => x !== user.id);
            await client.data.set(`noprefix_${client.user.id}`, bhai);
            return 
            //message.channel.send({ embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`**${client.emoji.tick} \`|\` Successfully Removed \`Non-Prefix\` From ${user}**`)] })
          }
      }

      if(opt === `remove`)
      {
          if(!user) return message.channel.send({embeds : [new EmbedBuilder().setColor(`#fcf707`).setDescription(`${client.emoji.cross} | Please provide me a valid user.`)]});
          let ok = bl.filter(x => x !== user.id);
          await client.data.set(`blacklist_${client.user.id}`,ok);
          await client.data.delete(`blreason_${user.id}`);
          return message.channel.send({embeds : [new EmbedBuilder().setColor(`#fcf707`).setDescription(`**${client.emoji.tick} | SuccessFully Removed ${user} from my \`Blacklist\`**`)]});
      }
      if (opt === 'show' || opt === 'list') {
        let db = await client.data.get(`blacklist_${client.user.id}`);
        if (!db ||db === null|| db.length === 0) {
            return message.channel.send({ embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`**${client.emoji.cross} | No Users In A Blacklist List.**`)] });
        }
        let count=0;
        let memberTags = [];
    for (const userId of db) {
        const member = await client.users.fetch(userId);
        count++;
        memberTags.push(`**\`${count}.\` [\`${member.username}#${member.discriminator}\`](https://discord.com/users/${member.id}) | \`${member.id}\`**`);
            
    }
        if (memberTags.length > 10) {
        let page = 0;
        const totalPages = Math.ceil(memberTags.length / 10);

        const generateEmbed = () => {
            const start = page * 10;
            const end = Math.min((page + 1) * 10, memberTags.length);
                
                return new EmbedBuilder()
                    .setColor(process.env.color)
                    .setAuthor({name: `List Of Members In A Blacklist`, iconURL: message.guild.iconURL({dynamic : true})})
                    .setTitle(`${client.emoji.users}Members With Blacklist : \`${count}\``)
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
            message.channel.send({embeds:[new EmbedBuilder().setAuthor({name: `List Of Members In A Blacklist`, iconURL: message.guild.iconURL({dynamic : true})}).setTitle(`${client.emoji.users}Members With \`Blacklist\`  : \`${count}\``).setDescription(`${memberTags.join('\n')}`)]})
            

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
    }
    if (opt === `reset`) {
      let b1 = new ButtonBuilder().setStyle(ButtonStyle.Success).setCustomId(`m1`).setEmoji(client.emoji.tick).setLabel(`Confirm`)
            let b2 = new ButtonBuilder().setStyle(ButtonStyle.Danger).setCustomId(`m2`).setEmoji(client.emoji.cross).setLabel(`Cancle`)
            let em1 = new EmbedBuilder().setColor(process.env.color).setDescription("**Are you sure you want to Reset \`Blacklist\` List?**");
            let ro3 = new ActionRowBuilder().addComponents(b1,b2);
            let msg = await message.channel.send({embeds : [em1],components : [ro3]});
            let call = await msg.createMessageComponentCollector({
                filter:(o) =>{
                    if(o.user.id === message.author.id) return true;
                    else{
                        return o.reply({content : `${client.emoji.cross} | This is not your session run ${prefix}npr reset instead.`,ephemeral : true})
                    }
                },
                //time : 50000,
            });
            call.on('collect',async(int) => {
                if(int.isButton())
                {
                    if(int.customId === `m1`)
                    {
                      setTimeout(() => {
                        int.update({embeds:[new EmbedBuilder().setDescription("**<a:loading:1426621893464817666> | Please Wait Reseting Blacklist Data**")],components : []})
                    }, 1000);
                    await client.data.delete(`blacklist_${client.user.id}`)
                      return setTimeout(() => {
                        msg.edit({embeds:[new EmbedBuilder().setDescription(`**${client.emoji.tick} | Blacklist Data Reset Successfully.**`)]})
                    }, 2500);
                    }
                    if(int.customId === `m2`)
                    {
                        return msg.delete().then(
                            message.delete()
                        )
                    }
                    
                }
            })
    
  }
  },
};
