const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const AutoRespond = require("../../models/autorespond");
module.exports = {
  name: 'autorespond',
  aliases: ['ar'],
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
      if (!args[0]) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`${client.emoji.cross} | Usage : \`${prefix}autorespond <add/remove/show/reset> <Trigger> ++ <Respond Message> ++ embed/normal\``)] })
      }
      
      const subCommand = args[0].toLowerCase();
      if (!subCommand || subCommand !== "add" && subCommand !== "remove" && subCommand != "list" && subCommand != "show" && subCommand != "reset")
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`${client.emoji.cross} | Usage : \`${prefix}autorespond <add/remove/show/reset> <Trigger> ++ <Respond Message> ++ embed/normal\``)] })

      if (subCommand === "add") {
        const input = args.slice(1).join(" ");
        let parts = input.split("++").map(s => s.trim());

        if (parts.length < 2) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`${client.emoji.cross} | Usage : \`${prefix}autorespond <add/remove/show/reset> <Trigger> ++ <Respond Message> ++ embed/normal\``)] })
        }
        let em = parts.length === 3
        if (!em){
          em =  `normal`
        }
        const [triggerWord, responseMessage] = parts;
        if (triggerWord.includes("@everyone") || triggerWord.includes("@here") || responseMessage.includes("@everyone") || responseMessage.includes("@here")) {
          return message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(process.env.color)
                .setDescription(`${client.emoji.cross} | You cannot use @everyone or @here in the trigger or response message.`),
            ],
          });
        }
        const responseType = parts.length === 3 ? parts[2].toLowerCase() : "normal";
        const isEmbed = responseType === "embed";
        const existingAutoRespond = await AutoRespond.findOne({
          guildId: message.guild.id,
          triggerWord: triggerWord
        });

        if (existingAutoRespond) {
          existingAutoRespond.responseMessage = responseMessage;
          existingAutoRespond.isEmbed = isEmbed;
          await existingAutoRespond.save();

          return message.channel.send({embeds:[new EmbedBuilder().setTitle(`Auto-Respond Updated`).setDescription(`**Trigger Word : ** *${triggerWord}*\n**Trigger Message : ** *${responseMessage}*\n**Embed : ** *${isEmbed}*`)]})
        } else {
          const autoRespondCount = await AutoRespond.countDocuments({ guildId: message.guild.id });

        if (autoRespondCount >= 10) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`${client.emoji.cross} *| You can only have a maximum of 10 auto-respond entries.*`)] });
        }
          const newAutoRespond = new AutoRespond({
            guildId: message.guild.id,
            triggerWord: triggerWord,
            responseMessage: responseMessage,
            isEmbed: isEmbed
          });

          await newAutoRespond.save();
          return message.channel.send({embeds:[new EmbedBuilder().setTitle(`Auto-Respond Added`).setDescription(`**Trigger Word : ** *${triggerWord}*\n**Trigger Message : ** *${responseMessage}*\n**Embed : ** *${isEmbed}*`)]})
        }
      } else if (subCommand === "remove") {
        if (args.length < 2) {
          return message.channel.send({ embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`${client.emoji.cross} | Usage : \`${prefix}autorespond remove <Trigger>`)] })
        }

        const triggerWord = args.slice(1).join(" ");

        const result = await AutoRespond.findOneAndDelete({
          guildId: message.guild.id,
          triggerWord: triggerWord
        });

        if (result) {
          return message.channel.send({embeds:[new EmbedBuilder().setTitle(`Auto-Respond Delete`).setDescription(`**Trigger Word : ** *${triggerWord}*`)]})
        } else {
          return message.channel.send({embeds:[new EmbedBuilder().setTitle(`Auto-Respond Not Found`).setDescription(`**Trigger Word : ** *${triggerWord}*`)]})
        }
      } else if (subCommand === "show" || subCommand === "list") {
        const autoResponds = await AutoRespond.find({ guildId: message.guild.id });

        if (!autoResponds.length) {
          return message.channel.send({embeds:[new EmbedBuilder().setDescription(`${client.emoji.cross} *| No Auto-Respond Found In This Server*`)]})
        }

        const embed = new EmbedBuilder()
          .setTitle("Auto-Respond Triggers")
          .setColor("#00FF00");

        autoResponds.forEach(ar => {
          embed.addFields({ name: ar.triggerWord, value: `(Embed: ${ar.isEmbed})` });
        });

        return message.channel.send({ embeds: [embed] });
      } else if (subCommand === "reset") {
        let b1 = new ButtonBuilder().setStyle(ButtonStyle.Success).setCustomId(`m1`).setEmoji(client.emoji.tick).setLabel(`Confirm`)
            let b2 = new ButtonBuilder().setStyle(ButtonStyle.Danger).setCustomId(`m2`).setEmoji(client.emoji.cross).setLabel(`Cancle`)
            let em1 = new EmbedBuilder().setColor(process.env.color).setDescription("**Are you sure you want to Reset \`Auto-Respond\` List?**");
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
                        int.update({embeds:[new EmbedBuilder().setDescription("**<a:loading:1426621893464817666> | Please Wait Reseting Auto-Respond Data**")],components : []})
                    }, 1000);
                    const autoResponds = await AutoRespond.find({ guildId: message.guild.id });
                    if (!autoResponds.length) { 
                    return setTimeout(() => {
                      msg.edit({ embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`${client.emoji.cross} *| No Auto-Respond data found*`)] });
                    }, 2500);
                    }
                    const deletedCount = await AutoRespond.deleteMany({ guildId: message.guild.id });
                     return setTimeout(() => {
                      msg.edit({ embeds: [new EmbedBuilder().setTitle("Auto-Respond Data Reset").setDescription(`${client.emoji.cross} *| Deleted \`${deletedCount.deletedCount}\` auto-respond entries.*`)] })
                    }, 2500);
                 }
                  
                    }
                    if(int.customId === `m2`)
                    {
                        return msg.delete().then(
                            message.delete()
                        )
                    }
            })
      }else {
        return message.channel.send({embeds: [new EmbedBuilder().setColor(process.env.color).setDescription(`${client.emoji.cross} | Usage : \`${prefix}autorespond <add/remove/show/reset> <Trigger> ++ <Respond Message> ++ embed/normal\``)] })
      }
  },
};
