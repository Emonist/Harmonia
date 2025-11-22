const ReactionRole = require('../../models/ReactionRole');

module.exports = {
  name: 'messageReactionAdd',
  async execute(client, reaction, user) {
    if (user.bot) return;

    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
    } catch {
      return;
    }

    const rr = await ReactionRole.findOne({
      guildId: reaction.message.guildId,
      channelId: reaction.message.channelId,
      messageId: reaction.message.id,
    });
    if (!rr) return;

    const entry = rr.roles.find(
      (r) => r.emoji === reaction.emoji.name || r.emoji === reaction.emoji.toString()
    );
    if (!entry) return;

    try {
      const member = await reaction.message.guild.members.fetch(user.id);
      if (!member.roles.cache.has(entry.roleId)) {
        await member.roles.add(entry.roleId);
      }
    } catch (err) {
      console.error("[REACTION ADD ROLE ERROR]", err);
    }
  }
};