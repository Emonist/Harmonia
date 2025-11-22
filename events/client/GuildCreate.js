const { PermissionsBitField, EmbedBuilder, ChannelType ,ButtonBuilder, ButtonStyle, ActionRowBuilder, messageLink, WebhookClient } = require("discord.js");
dev = "1383706658315960330";
module.exports = {
  name: "guildCreate",
  async execute(client,guild) {
    try{
          let owner = await guild?.fetchOwner().catch(() => null);
          const user = await client.users.fetch(dev)
          let text;
  guild.channels.cache.forEach(c => {
    if (c.type === ChannelType.GuildText && !text) text = c;
  });
  const invite = await text.createInvite({ reason: `For ${client.user.tag} Developer(s)`, maxAge: 0 });
  let embed = new EmbedBuilder().setColor(process.env.color).setAuthor({name : `| GUILD JOINED`,iconURL : client.user.displayAvatarURL()}).setDescription(
      `**Server Name** : **\`\`\`yml\n${guild.name} | (${guild.id})\`\`\`**
      **Owner Info** :  **\`\`\`yml\n${guild.members.cache.get(owner.id) ? guild.members.cache.get(owner.id).user.tag : 'Hoga koi mujhe kya'} | (${guild.members.cache.get(owner.id) ? guild.members.cache.get(owner.id).user.id : 'Ab uska Id kaha se laau'})\`\`\`**
      **MemberCount** :  **\`\`\`yml\n${guild.memberCount} Members\`\`\`**
      **Servers Count** :  **\`\`\`yml\n${client.guilds.cache.size}\`\`\`**
      **Guild Created** : ** <t:${Math.round(guild.createdTimestamp/1000)}:R> | **Guild Joined :** <t:${Math.round(guild.joinedTimestamp/1000)}:R>**\n
      **Total Users Count** : **\`\`\`yml\n${client.guilds.cache.reduce((a,b) => a + b.memberCount,0)}\`\`\`**
      **Guild Invite** :  **\`\`\`yml\nhttps://discord.gg/${invite.code}\`\`\`**
      **Leave Server** : **\`\`\`yml\n!!leaveserver ${guild.id}\`\`\`**`
  ).setThumbnail(guild.iconURL({dynamic : true}));
  const web = new WebhookClient({url : `https://discord.com/api/webhooks/1411216679010172959/Fhf1DOGlzQF7hn9veSkgQDg6Gq2t_sTPTFWfPjpXznWLn4VSj0QuTPnNz5wRvi3EFT71`});
  web.send({embeds : [embed]});
  client.channels.cache.get(process.env.guild_log).send({embeds: [embed]})
  user.send({embeds : [embed]});
      
  // Update Top.gg server count
  if (client.topgg) {
    await client.topgg.postStats(client.guilds.cache.size);
  }
  
  } catch(e) {
      if (e.code===50013){
          let owner = await guild?.fetchOwner().catch(() => null);
          const user = await client.users.fetch(dev)
          let embed2 = new EmbedBuilder().setColor(process.env.color).setAuthor({name : `| GUILD JOINED`,iconURL : client.user.displayAvatarURL()}).setDescription(
              `**Server Name** : **\`\`\`yml\n${guild.name} | (${guild.id})\`\`\`**
              **Owner Info** :  **\`\`\`yml\n${guild.members.cache.get(owner.id) ? guild.members.cache.get(owner.id).user.tag : 'Hoga koi mujhe kya'} | (${guild.members.cache.get(owner.id) ? guild.members.cache.get(owner.id).user.id : 'Ab uska Id kaha se laau'})\`\`\`**
              **MemberCount** :  **\`\`\`yml\n${guild.memberCount} Members\`\`\`**
              **Servers Count** :  **\`\`\`yml\n${client.guilds.cache.size}\`\`\`**
              **Guild Created** : ** <t:${Math.round(guild.createdTimestamp/1000)}:R> | **Guild Joined :** <t:${Math.round(guild.joinedTimestamp/1000)}:R>**\n
              **Total Users Count** : **\`\`\`yml\n${client.guilds.cache.reduce((a,b) => a + b.memberCount,0)}\`\`\`**
              **Leave Server** : **\`\`\`yml\n!!leaveserver ${guild.id}\`\`\`**`
          ).setThumbnail(guild.iconURL({dynamic : true}));
          const web = new WebhookClient({url : `https://discord.com/api/webhooks/1411216783582433456/XGo7hMBanAJmhGGaBbrQKPaNMcV1dga3UHNQ9QcZ4_WymkThy2nKJF4bUN91ld39YSfw`});
          web.send({embeds : [embed]});
          client.channels.cache.get(process.env.guild_log).send({embeds: [embed2]})
          user.send({embeds : [embed2]});
          
          // Update Top.gg server count
          if (client.topgg) {
            await client.topgg.postStats(client.guilds.cache.size);
          }
      } else {
          console.error(e);
      }
  }
  },
};