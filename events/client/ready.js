const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const GuildSettings = require('../../models/guildSettings') 
const ReactionRoles = require('../../models/ReactionRole') 
const { ActivityType } = require('discord.js');
const logger = require('../../helpers/logger');
const resumeGiveaways = require('../../structures/resume');
const { checkActiveGiveaways } = require('../../structures/giveaway');
const { remindme,temprole,tempban,reactionrole } = require('../../structures/autohandle');
const { checkAndResetLeaderboards } = require('../music/leaderboardReset');
module.exports = {
  name: 'ready',
  async execute(client) {
    try {
      await checkActiveGiveaways(client);
      await remindme(client);
      await temprole(client);
      await tempban(client);
      await reactionrole(client);
    } catch (error) {
      logger.errorWithStack('Error in ready event database operations', error);
      // Continue with other initialization even if some database operations fail
    }
    logger.success('Music leaderboard checker is running');
    const leaderboardInterval = setInterval(async () => {
      try {
        await checkAndResetLeaderboards(client);
        //console.log('Leaderboard reset check completed');
      } catch (error) {
        logger.error('Error in leaderboard reset', error);
      }
    }, 1 * 60 * 1000);
    const figlet = require('figlet');

    // Update Top.gg server count on ready
    if (client.topgg) {
      setTimeout(async () => {
        await client.topgg.postStats(client.guilds.cache.size);
      }, 5000); // Wait 5 seconds after ready to ensure guild cache is populated
    }

// Bot ready banner
figlet(client.user.tag, function (err, data) {
    if (err) {
        logger.error('Failed to generate ASCII art', err);
        return;
    }
    logger.section('Bot Online');
    console.log(data.cyan.bold);
    logger.blank();
});

  
    try {
      await resumeGiveaways(client);
      logger.success('Giveaways resumed');
    } catch (error) {
      logger.errorWithStack('Error resuming giveaways', error);
    }
    function nFormatter(num, digits = 2) {
        const lookup = [
          { value: 1, symbol: "" },
          { value: 1e3, symbol: "k" },
          { value: 1e6, symbol: "M" },
          { value: 1e9, symbol: "G" },
          { value: 1e12, symbol: "T" },
          { value: 1e15, symbol: "P" },
          { value: 1e18, symbol: "E" }
        ];
        const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
        var item = lookup.slice().reverse().find(function(item) {
          return num >= item.value;
        });
        return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
      }
    const MemberCount = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const tmember = nFormatter(MemberCount);
    let statuses = [`.help | Harmonia Music | ${client.guilds.cache.size} Guilds | ${MemberCount} Users`,`Song With ${tmember} Members`, "BEST MUSIC BOT 2025","Harmonia | ! Ansh ."]
    let omges = [`online`,`dnd`,`idle`]
    let activityes = [`Listening`,`Watching`,`Playing`,`Streaming`]
    
    // Clear any existing status interval to prevent memory leaks
    if (client.statusInterval) {
      clearInterval(client.statusInterval);
      client.activeIntervals.delete(client.statusInterval);
    }
    
    client.statusInterval = setInterval(() => {
        try {
          let status = statuses[Math.floor(Math.random()*statuses.length)];		
          let omg = omges[Math.floor(Math.random()*omges.length)];
          let lol = activityes[Math.floor(Math.random()*activityes.length)];
          let activityType;
          if (lol === "Playing") {
          activityType = ActivityType.Playing;
            } else if (lol === "Streaming") {
          activityType = ActivityType.Streaming;
            }else if (lol === "Watching") {
          activityType = ActivityType.Watching;
          } else if (lol === "Listening") {
          activityType = ActivityType.Listening;
           } else {
          activityType = ActivityType.Playing;
        }
      
            client.user.setPresence({
                activities: [
                    {
                        name: status,
                        type: activityType,
                        url : "https://www.twitch.tv/anshgaming69"
                    }
                ],
                status: omg,
            });
        } catch (error) {
          logger.error('Error updating status', error);
        }
      }, 10000);
      
    // Track the interval for cleanup
    client.activeIntervals.add(client.statusInterval);
    
    // Connect Lavalink nodes after client is ready - using Music-Bot-main pattern
    if (client.poru && client.lavalinkPromise) {
      logger.subsection('Initializing Music System');
      
      // Start Poru connection (similar to poru.init in Music-Bot-main)
      try {
        if (client.poru && typeof client.poru.init === 'function') {
          client.poru.init(client.user.id);
          logger.success('Poru initialized');
        }
      } catch (startError) {
        logger.errorWithStack('Error starting Poru', startError);
      }
      
      // Setup music events
      try {
        const { setupMusicEvents } = require('../music/poruEvents');
        setupMusicEvents(client);
        logger.success('Music events initialized');
      } catch (eventsError) {
        logger.errorWithStack('Error setting up music events', eventsError);
      }

      // Wait for connection using promise pattern from Music-Bot-main
      setTimeout(async () => {
        try {
          logger.info('Waiting for Lavalink connection...');
          const node = await Promise.race([
            client.lavalinkPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout')), 15000)
            )
          ]);
          logger.success(`Lavalink node connected: ${node.name}`);
        } catch (error) {
          logger.error(`Lavalink connection failed: ${error.message}`);
          // Don't use fallback - let it connect naturally
        }
      }, 2000); // Wait 2 seconds after ready for Poru to start connecting
    }
    
    // Display bot statistics
    logger.blank();
    logger.section('Bot Statistics');
    logger.table([
      { key: 'Guilds', value: `${client.guilds.cache.size}`, color: 'cyan' },
      { key: 'Users', value: `${MemberCount} (${tmember})`, color: 'cyan' },
      { key: 'Commands', value: `${client.commands.size}`, color: 'green' },
      { key: 'Slash Commands', value: `${client.slashCommands.size}`, color: 'green' },
    ]);

  },
};
