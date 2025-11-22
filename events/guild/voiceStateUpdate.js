const VcRole = require('../../models/VcRole');
const { REST } = require("@discordjs/rest");

const playerStates = new Map();
const lastStatusUpdate = new Map();

function canUpdateStatus(guildId, cooldown = 5000) {
  const now = Date.now();
  if (!lastStatusUpdate.has(guildId) || now - lastStatusUpdate.get(guildId) > cooldown) {
    lastStatusUpdate.set(guildId, now);
    return true;
  }
  return false;
}

module.exports = {
  name: 'voiceStateUpdate',
  async execute(client, oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member || !member.guild) return;
    //Auto-Reconnect Activated
    if (oldState.member?.id === client.user.id && !newState.channelId) {
        console.log(`Bot was disconnected from voice channel in guild ${oldState.guild.id}`);
        const player = client.poru?.players?.get(oldState.guild.id);
        // Check if player exists and is not already destroyed before attempting to destroy
        if (player) {
          try {
            player.destroy();
          } catch (error) {
            console.error(`Error destroying player for guild ${oldState.guild.id}:`, error);
          }
        }
    }
    // End Auto-Reconnected
    const guild = member.guild;
    const player = client.poru?.players?.get(guild.id);
    const hasJoinedVC = !oldState.channelId && newState.channelId;
    const hasLeftVC = oldState.channelId && !newState.channelId;

    // ==== VC ROLE HANDLING ====
    if (hasJoinedVC || hasLeftVC) {
      try {
        const roles = await VcRole.getGuildRoles(guild.id);
        if (roles.length) {
          for (const { roleId } of roles) {
            const role = guild.roles.cache.get(roleId);
            if (!role) continue;
            
            try {
              if (hasJoinedVC && !member.roles.cache.has(role.id)) {
                await member.roles.add(role).catch(() => null);
              } else if (hasLeftVC && member.roles.cache.has(role.id)) {
                await member.roles.remove(role).catch(() => null);
              }
            } catch (err) {
              console.error(`[VC ROLE ERROR]:`, err);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching VC roles:', err);
      }
    }
    // ==== MUSIC PLAYER AUTO-PAUSE / RESUME ====
    if (!player || !player.voiceChannel || !player.currentTrack) return;
    
    const botVoiceChannel = guild.members.me?.voice?.channel;
    if (!botVoiceChannel) return;

    // Only trigger if the join/leave is in the bot's VC
    if (oldState.channelId !== botVoiceChannel.id && newState.channelId !== botVoiceChannel.id) return;

    // Count only humans in the bot's VC
    const humanMembers = botVoiceChannel.members.filter(m => !m.user.bot);
    const state = playerStates.get(guild.id) || {};

    try {
      // Auto-pause if VC empty
      if (humanMembers.size === 0 && !player.isPaused) {
        player.pause(true);
        playerStates.set(guild.id, { ...state, autoPaused: true });
        console.log(`Player paused in ${guild.name} - VC empty`);

        if (canUpdateStatus(guild.id)) {
          await updateVoiceStatus(botVoiceChannel.id, `<:harmonia:1426599166733320202> Paused: VC Empty`,guild.id);
        }
      }
      // Resume if members return
      else if (humanMembers.size > 0 && state.autoPaused && player.isPaused) {
        player.pause(false);
        playerStates.set(guild.id, { ...state, autoPaused: false });
        console.log(`Player resumed in ${guild.name} - ${humanMembers.size} human(s) returned`);

        if (canUpdateStatus(guild.id)) {
          await updateVoiceStatus(botVoiceChannel.id, `<:harmonia:1426599166733320202> Now Playing: ${player.currentTrack?.info?.title || 'Unknown'}`,guild.id);
        }
      }
    } catch (err) {
      console.error('Error handling VC music auto-pause/resume:', err);
    }
  }
};

// Helper function to update voice status
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
async function updateVoiceStatus(channelId, status,guildId) {
  try {
    //const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
    await rest.put(`/channels/${channelId}/voice-status`, {
      body: { status },
    });
  } catch (e) {
    console.error(`Failed to update voice status for guild ${guildId}, channel ${channelId}:`, e);
    // If we get rate limited, extend the cooldown
    if ((e.status === 429 || e.statusCode === 429) && guildId) {
      const retryAfter = e.data?.retry_after ? e.data.retry_after * 1000 : 5000;
      lastStatusUpdate.set(guildId, Date.now() + retryAfter);
    }
  }
}