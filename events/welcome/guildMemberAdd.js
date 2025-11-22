const WelcomeSettings = require('../../models/WelcomeSchema');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    //console.log(`[DEBUG] ${member.user.tag} joined ${member.guild.name}`);

    const guildID = member.guild.id;
    const settings = await WelcomeSettings.findOne({ guildID });
    if (!settings) {
      //console.log('[DEBUG] No welcome settings found');
      return;
    }

    const formatMessage = (msg) => {
      return msg
        ?.replace(/{mention}/g, `${member}`)
        .replace(/{server}/g, member.guild.name)
        .replace(/{user}/g, member.user.username)
        .replace(/{tag}/g, member.user.tag)
        .replace(/{user.tag}/g, member.user.tag)
        .replace(/{server.members}/g, member.guild.memberCount)
        .replace(/{id}/g, member.id)
        .replace(/{newline}/g, `\n`)
        .replace(/{user_avatar}/g, member.user.displayAvatarURL({ dynamic: true }))
        .replace(/{user_guild}/g, member.guild.iconURL({ dynamic: true }));
    };

    const isValidUrl = (string) => {
      try {
        new URL(string);
        return true;
      } catch (_) {
        return false;
      }
    };

    // ───────────── NORMAL MESSAGE ─────────────
    if (settings.nmessage && settings.channelIDN?.length > 0) {
      //console.log('[DEBUG] Sending normal welcome messages...');
      for (const channelId of settings.channelIDN) {
        const channel = member.guild.channels.cache.get(channelId);
        if (!channel) {
          //console.log(`[DEBUG] Normal channel ${channelId} not found`);
          continue;
        }

        const message = formatMessage(settings.nmsg || 'Welcome {mention} to {server}!');
        try {
          const sentMsg = await channel.send({ content: message });

          if (settings.autodel && typeof settings.autodel === 'number') {
            setTimeout(() => {
              sentMsg.delete().catch(console.error);
            }, settings.autodel);
          }
        } catch (err) {
          console.error(`[DEBUG] Failed to send normal welcome message:`, err);
        }
      }
    } else {
      //console.log('[DEBUG] Normal welcome message is disabled or no channels set');
    }

    // ───────────── EMBED MESSAGE ─────────────
    if (settings.embed && settings.channelId) {
      const channel = member.guild.channels.cache.get(settings.channelId);
      if (!channel) {
        //console.log('[DEBUG] Embed welcome channel not found');
        return;
      }

      const opt = settings.embedOptions || {};
      const formattedOptions = {
        title: formatMessage(opt.title || 'Welcome!'),
        description: formatMessage(opt.description || 'Hey {mention} Welcome To {server}'),
        footer: formatMessage(opt.footer || ''),
        footerAvatar: formatMessage(opt.footerAvatar || ''),
        author: formatMessage(opt.author || ''),
        authorAvatar: formatMessage(opt.authorAvatar || ''),
        thumbnail: formatMessage(opt.thumbnail || ''),
        image: formatMessage(opt.image || ''),
        url: formatMessage(opt.url || ''),
        color: opt.color || '#00FF00'
      };

      const embed = new EmbedBuilder()
        //.setTitle(formattedOptions.title)
        .setColor(formattedOptions.color)
        //.setDescription(formattedOptions.description);

      if (formattedOptions.description  && formattedOptions.description !== "null") {
        embed.setDescription(formattedOptions.description);
      }

      if (formattedOptions.title  && formattedOptions.title !== "null" ) {
        embed.setTitle(formattedOptions.title);
      }
      if (formattedOptions.thumbnail && isValidUrl(formattedOptions.thumbnail)) {
        embed.setThumbnail(formattedOptions.thumbnail);
      }

      if (formattedOptions.image && isValidUrl(formattedOptions.image)) {
        embed.setImage(formattedOptions.image);
      }
      if (formattedOptions.footer || isValidUrl(formattedOptions.footerAvatar)) {
        embed.setFooter({
          text: formattedOptions.footer || '',
          iconURL: isValidUrl(formattedOptions.footerAvatar) ? formattedOptions.footerAvatar : null,
        });
      }

      if (formattedOptions.author) {
        embed.setAuthor({
          name: formattedOptions.author,
          iconURL: isValidUrl(formattedOptions.authorAvatar) ? formattedOptions.authorAvatar : null,
        });
      }
      if (formattedOptions.url && isValidUrl(formattedOptions.url)) {
        embed.setURL(formattedOptions.url);
      }

      // if (formattedOptions.thumbnail && isValidUrl(formattedOptions.thumbnail)) {
      //   embed.setThumbnail(formattedOptions.thumbnail);
      // }

      // if (formattedOptions.image && isValidUrl(formattedOptions.image)) {
      //   embed.setImage(formattedOptions.image);
      // }

      // if (formattedOptions.footer || isValidUrl(formattedOptions.footerAvatar)) {
      //   embed.setFooter({
      //     text: formattedOptions.footer || '',
      //     iconURL: isValidUrl(formattedOptions.footerAvatar) ? formattedOptions.footerAvatar : null,
      //   });
      // }

      // if (formattedOptions.author) {
      //   embed.setAuthor({
      //     name: formattedOptions.author,
      //     iconURL: isValidUrl(formattedOptions.authorAvatar) ? formattedOptions.authorAvatar : null,
      //   });
      // }

      // if (formattedOptions.url && isValidUrl(formattedOptions.url)) {
      //   embed.setURL(formattedOptions.url);
      // }

      try {
        const content = formatMessage(settings.message || '');
        const sentEmbedMsg = await channel.send({
          content: content || null,
          embeds: [embed],
        });

        if (settings.emautodel && typeof settings.emautodel === 'number') {
          setTimeout(() => {
            sentEmbedMsg.delete().catch(console.error);
          }, settings.emautodel);
        }
      } catch (err) {
        console.error(`[DEBUG] Failed to send embed welcome message:`, err);
      }
    } else {
      //console.log('[DEBUG] Embed welcome message is disabled or channel not set');
    }

    // ───────────── AUTOROLES ─────────────
    if (!member.user.bot && settings.autoroleHumans?.length > 0) {
      for (const roleId of settings.autoroleHumans) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
          member.roles.add(role).catch(console.error);
        }
      }
    }

    if (member.user.bot && settings.autoroleBots?.length > 0) {
      for (const roleId of settings.autoroleBots) {
        const role = member.guild.roles.cache.get(roleId);
        if (role) {
          member.roles.add(role).catch(console.error);
        }
      }
    }
  },
};
