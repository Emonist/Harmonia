
const Giveaway = require('../models/giveaway');
const { scheduleGiveawayEnd, endGiveaway } = require('../structures/giveaway');
const color = require("colors");

async function resumeGiveaways(client) {
  try {
    const now = new Date();
    console.log(color.bold.cyan(`🎁 Checking for giveaways to resume at ${now.toISOString()}`));

    // Find all active giveaways that haven't been scheduled yet
    const activeGiveaways = await Giveaway.find({
      isActive: true,
      endTime: { $gt: new Date() }
    });

    console.log(color.bold.blue(`🎁 Found ${activeGiveaways.length} active giveaways to process`));


    for (const giveaway of activeGiveaways) {
      try {
        const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
        if (!channel) {
          console.log(`❌ Channel not found for giveaway ${giveaway.messageId}`);
          continue;
        }

        const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (!msg) {
          console.log(`❌ Message not found for giveaway ${giveaway.messageId}`);
          continue;
        }

        // Check if giveaway should have already ended
        if (giveaway.endTime <= now) {
          console.log(color.bold.green(`🎁 Giveaway ${giveaway.messageId} should have ended, ending now`));

          await endGiveaway(client, giveaway, msg);
        } else {
          console.log(color.bold.red(`🎁 Rescheduling giveaway ${giveaway.messageId} to end at ${giveaway.endTime.toISOString()}`));
          await scheduleGiveawayEnd(client, giveaway, msg);
        }
      } catch (err) {
        console.error('Error resuming giveaway:', giveaway.messageId, err);
      }
    }

    // Also handle any giveaways that should have ended but are still marked as active
    const missedGiveaways = await Giveaway.find({
      isActive: true,
      endTime: { $lt: now },
      endedAt: null
    });

    console.log(color.bold.cyan(`🎁 Found ${missedGiveaways.length} missed giveaways to end`));

    for (const giveaway of missedGiveaways) {
      try {
        const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
        if (!channel) {
          console.log(`❌ Channel not found for missed giveaway ${giveaway.messageId}`);
          continue;
        }

        const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (!msg) {
          console.log(`❌ Message not found for missed giveaway ${giveaway.messageId}`);
          continue;
        }

        //console.log(`🎁 Ending missed giveaway ${giveaway.messageId}`);
        await endGiveaway(client, giveaway, msg);
      } catch (err) {
        console.error('Error ending missed giveaway:', giveaway.messageId, err);
      }
    }

    const totalProcessed = activeGiveaways.length + missedGiveaways.length;
    console.log(color.bold.cyan(`
  ╭──────────────────────────────────────────────────╮
  │  ✓ !! Giveaway Resumed ${totalProcessed} giveaways.!! ⚡          │
  ╰──────────────────────────────────────────────────╯
          `));
  } catch (error) {
    console.error('Error in resumeGiveaways:', error);
  }
}

module.exports = resumeGiveaways;
