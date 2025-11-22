const Poll = require("../models/Poll.js");
const { EmbedBuilder } = require("discord.js");

class PollManager {
    constructor(client) {
        this.client = client;
        this.checkInterval = null;
        this.isRunning = false;
    }

    async start() {
        if (this.isRunning) {
            console.warn('PollManager is already running');
            return;
        }
        
        this.isRunning = true;
        
        // Check for ended polls immediately on start
        await this.checkEndedPolls();

        // Set up interval to check polls every 14 sec
        this.checkInterval = setInterval(() => {
            if (this.isRunning) {
                this.checkEndedPolls().catch(err => {
                    console.error('Error in poll check interval:', err);
                });
            }
        }, 14000);
        
        // Track interval for cleanup
        if (this.client.activeIntervals) {
            this.client.activeIntervals.add(this.checkInterval);
        }
    }

    async stop() {
        this.isRunning = false;
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            
            // Remove from tracking
            if (this.client.activeIntervals) {
                this.client.activeIntervals.delete(this.checkInterval);
            }
            
            this.checkInterval = null;
        }
    }

    async checkEndedPolls() {
        if (!this.isRunning) return;
        
        try {
            // Find all active polls that have ended - use lean() for better performance
            const endedPolls = await Poll.find({
                active: true,
                endTimestamp: { $lte: Date.now() }
            }).lean().limit(10); // Limit batch size to prevent memory issues

            if (endedPolls.length === 0) return;

            for (const poll of endedPolls) {
                if (!this.isRunning) break; // Stop if manager is shutting down
                
                try {
                    await this.endPoll(poll);
                    // Add small delay between processing polls to prevent rate limits
                    await new Promise(resolve => {
                        const timeout = setTimeout(resolve, 1000);
                        if (this.client.activeTimeouts) {
                            this.client.activeTimeouts.add(timeout);
                        }
                    });
                } catch (pollError) {
                    console.error(`Error processing poll ${poll.messageId}:`, pollError);
                }
            }
        } catch (error) {
            console.error('Error checking ended polls:', error);
        }
    }

    async endPoll(poll) {
        try {
            // Double check if poll is still active
            const currentPoll = await Poll.findOne({ messageId: poll.messageId });
            if (!currentPoll || !currentPoll.active) return;

            const guild = await this.client.guilds.fetch(poll.guildId);
            if (!guild) return;

            const channel = await guild.channels.fetch(poll.channelId);
            if (!channel) return;

            const message = await channel.messages.fetch(poll.messageId);
            if (!message) return;

            // Get final counts
            const upVotes = message.reactions.cache.get('1150668074136113182')?.count - 1 || 0;
            const downVotes = message.reactions.cache.get('1150668062362705990')?.count - 1 || 0;

            // Format end time
            const endTimeIST = formatToIST(Date.now());

            // Send results
            await message.reply({
                content: `<@${poll.authorId}>`,
                embeds: [
                    new EmbedBuilder()
                        .setColor(process.env.color)
                        .setTitle(`Polling Result For "${poll.question}"`)
                        .setDescription(
                            `**<:tick:1426593644202426551> \`:\` ${upVotes} votes\n` +
                            `<:cut:1150668062362705990> \`:\` ${downVotes} votes\n\n` +
                            `📅 Started At \`:\` ${poll.startTime}\n` +
                            `📅 Ended At \`:\` ${endTimeIST}**`
                        )
                ]
            });

            // Mark poll as inactive
            currentPoll.active = false;
            await currentPoll.save();

        } catch (error) {
            console.error(`Error ending poll ${poll.messageId}:`, error);
            // Mark poll as inactive even if there's an error
            await Poll.findOneAndUpdate(
                { messageId: poll.messageId },
                { active: false }
            ).catch(() => {});
        }
    }
}

function formatToIST(timestamp) {
    const date = new Date(timestamp);
    date.setMinutes(date.getMinutes() + 330); // Add 5 hours and 30 minutes for IST
    return date.toISOString().replace('T', ' ').slice(0, 19) + ' IST';
}

module.exports = PollManager;