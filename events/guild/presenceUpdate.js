const DB = require('../../models/VanityConfig');
const { PermissionFlagsBits, ActivityType } = require('discord.js');

class RoleQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  add(fn) {
    this.queue.push(fn);
    this.process();
  }

  async process() {
    if (this.processing) return;
    this.processing = true;
    while (this.queue.length) {
      const fn = this.queue.shift();
      try {
        await fn();
        await new Promise(res => setTimeout(res, 1200));
      } catch (e) {
        console.error('[QUEUE_ERR]', e);
      }
    }
    this.processing = false;
  }
}

const roleQueue = new RoleQueue();

module.exports = {
  name: 'presenceUpdate',
  async execute(bot, oldPresence, newPresence) {
    if (!newPresence?.guild || !newPresence?.member) return;

    const user = newPresence.member;
    const guild = user.guild;
    const perms = guild.members.me?.permissions;

    if (!perms?.has(PermissionFlagsBits.ManageRoles)) return;

    // Get custom status
    const act = newPresence.activities?.find(x => x.type === ActivityType.Custom);
    const currentStatus = act?.state?.toLowerCase() || '';

    let config;
    try {
      config = await DB.findOne({ guildId: guild.id });
    } catch (e) {
      console.error(`[DB_ERROR] Failed to fetch vanity config for ${guild.id}:`, e);
      return;
    }

    if (!config?.vanities?.length) return;

    for (const { vanity, role } of config.vanities) {
      const roleObj = guild.roles.cache.get(role);
      if (!roleObj) continue;

      const shouldHave = currentStatus.includes(vanity.toLowerCase());
      const hasRole = user.roles.cache.has(roleObj.id);

      // Enqueue role add/remove operation in queue
      if (shouldHave && !hasRole) {
        roleQueue.add(async () => {
          try {
            await user.roles.add(roleObj, 'Vanity match in custom status').catch(() => null);
          } catch (err) {
            if (err.code !== 50013) {
              console.error(`[ADD_ERR] ${user.user.tag} in ${guild.name}:`, err);
            }
          }
        });
      } else if (!shouldHave && hasRole) {
        roleQueue.add(async () => {
          try {
            await user.roles.remove(roleObj, 'Vanity removed from custom status').catch(() => null);
          } catch (err) {
            if (err.code !== 50013) {
              console.error(`[REMOVE_ERR] ${user.user.tag} in ${guild.name}:`, err);
            }
          }
        });
      }
    }
  }
};