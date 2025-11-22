const GuildSettings = require('../../models/guildSettings');

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    //console.log(`[DEBUG] Member joined: ${member.user.tag}`);

    if (!member.guild) return //console.log('[DEBUG] No guild found.');

    const settings = await GuildSettings.findOne({ guildId: member.guild.id });
    //console.log('[DEBUG] Auto Roles Data:', settings?.autoRoles);

    if (!settings?.autoRoles)
      return //console.log('[DEBUG] No auto roles found in database.');

    const rolesToAdd = [
      ...(member.user.bot ? settings.autoRoles.bots : []),
      ...settings.autoRoles.all,
    ];
    //console.log('[DEBUG] Roles to Assign:', rolesToAdd);
    //console.log(
      //`[DEBUG] Roles to Assign: ${rolesToAdd.map((id) => `<@&${id}>`).join(', ')}`,
  //  );
        let botMember = member.guild.members.me;
        if (!botMember) {
          botMember = await member.guild.members.fetchMe(); // Fetch only once
        }

        const validRoles = rolesToAdd.filter((roleId) => {
        const role = member.guild.roles.cache.get(roleId);
        if (!role) return false;

        if (botMember.roles.highest.position <= role.position) return false;

        return true;
      });

//OLD
    // const validRoles = rolesToAdd.filter((roleId) => {
    //   const role = member.guild.roles.cache.get(roleId);
    //   if (!role) {
    //     //console.log(`[❌] Role not found: ${roleId}`);
    //     return false;
    //   }
    //   if (member.guild.members.me.roles.highest.position <= role.position) {
    //     //console.log(`[❌] Bot cannot assign: <@&${roleId}> (Role too high)`);
    //     return false;
    //   }
    //   return true;
    // });
//OLD END
    if (validRoles.length > 0) {
      try {
        await member.roles.add(validRoles).catch(() => null);
        //console.log(
          //`[✅] Assigned roles to ${member.user.tag}: ${validRoles.map((id) => `<@&${id}>`).join(', ')}`,
        //);
      } catch (error) {
        //console.error(`❌ Failed to assign roles:`, error);
      }
    } else {
      //console.log(`[❌] No valid roles to assign.`);
    }
  },
};
