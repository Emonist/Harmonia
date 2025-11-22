const { EmbedBuilder,ChannelType, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
module.exports = {
  name: 'deleteallchannel',
  aliases: ["channeldeleteall","cda"],
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
        return message.channel.send({embeds : [new EmbedBuilder().setColor(process.env.color).setDescription(`${client.emoji.cross} | Command Usage : \`${prefix}deleteallchannel <category_id>\``)]})
    }
    let categoryId = args[0];
    const category = await message.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.id === categoryId);
        if(!category){
            return message.channel.send({embeds:[new EmbedBuilder().setDescription(`**${client.emoji.cross} | Invalid Category Id**`)]})
        }
    const guildChannels = await message.guild.channels.fetch();
    const channelsToDelete = guildChannels.filter(channel => channel.parentId === categoryId);
    let count = 0;
    let b1 = new ButtonBuilder().setStyle(ButtonStyle.Success).setCustomId(`m1`).setEmoji(client.emoji.tick).setLabel(`Confirm`)
    let b2 = new ButtonBuilder().setStyle(ButtonStyle.Danger).setCustomId(`m2`).setEmoji(client.emoji.cross).setLabel(`Cancle`)
    let em1 = new EmbedBuilder().setColor(process.env.color).setDescription(`**Are you sure you want to Delete all Channel From \`${category.name}\` ?**`);
    let ro3 = new ActionRowBuilder().addComponents(b1,b2);
    let msg = await message.channel.send({embeds : [em1],components : [ro3]});
    let call = await msg.createMessageComponentCollector({
        filter:(o) =>{
            if(o.user.id === message.author.id) return true;
            else{
                return o.reply({content : `${client.emoji.cross} | This is not your session run ${prefix}channeldeleteall instead.`,ephemeral : true})
            }
        },
        //time : 50000,
    });

    call.on('collect',async(int) => {
        if(int.isButton())
        {
            if(int.customId === `m1`)
            {
                return msg.delete().then(ch => {
                    channelsToDelete.forEach(channel => {
                        count++
                        channel.delete()
                            //.then(ch => msg.edit({embeds:[new EmbedBuilder().setDescription(`Deleting ${ch.name} Channel....`)]}))
                            .catch(console.error);
                    });
                message.channel.send({embeds : [new EmbedBuilder().setColor(process.env.color).setDescription(`**${client.emoji.tick} | SuccessFully Deleted \`${count}\` channels.**`)]})
            })
                
            }
            if(int.customId === `m2`)
            {
                return msg.delete().then(
                    message.delete()
                )
            }
            
        }
    })
  },
};
