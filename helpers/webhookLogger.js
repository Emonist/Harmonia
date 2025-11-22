const { WebhookClient, EmbedBuilder } = require('discord.js');

// Webhook URLs
const COMMAND_LOG_WEBHOOK = 'https://discord.com/api/webhooks/1438483227856863232/m2sNuQ-vYC5q0u910yn20gocA0ahZXysPOlhOvSlQptU_gxkz9sRNOMm-NJT61Wt-xXq';
const ERROR_LOG_WEBHOOK = 'https://discord.com/api/webhooks/1433488906678042755/v9aA07VxXr2Y7xuFg6p-aRO6f2RWBRU863y6oIMj17qgrVCqPjeBz9CydAZBMvEAi_a2';

// Initialize webhook clients
let commandWebhook = null;
let errorWebhook = null;

try {
  commandWebhook = new WebhookClient({ url: COMMAND_LOG_WEBHOOK });
} catch (err) {
  console.error('Failed to initialize command logging webhook:', err);
}

try {
  errorWebhook = new WebhookClient({ url: ERROR_LOG_WEBHOOK });
} catch (err) {
  console.error('Failed to initialize error logging webhook:', err);
}

/**
 * Log command usage to webhook
 * @param {Object} client - Discord client
 * @param {Object} data - Command data
 */
async function logCommand(client, data) {
  if (!commandWebhook) return;

  try {
    const {
      commandName,
      user,
      guild,
      channel,
      fullCommand,
      isSlash = false,
      args = [],
      executionTime = null,
    } = data;

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Command Executed')
      .addFields(
        {
          name: 'Command',
          value: `\`${commandName}\``,
          inline: true,
        },
        {
          name: 'Type',
          value: isSlash ? 'Slash Command' : 'Message Command',
          inline: true,
        },
        {
          name: 'User',
          value: `${user.tag}\n\`${user.id}\``,
          inline: true,
        },
        {
          name: 'Guild',
          value: guild
            ? `${guild.name}\n\`${guild.id}\`\n${guild.memberCount} members`
            : 'DM',
          inline: true,
        },
        {
          name: 'Channel',
          value: channel
            ? `${channel.name || 'DM'}\n\`${channel.id || 'N/A'}\``
            : 'Unknown',
          inline: true,
        },
        {
          name: 'Timestamp',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true,
        }
      )
      .setFooter({
        text: `${client.user.tag} | Shard: ${client.shard?.ids?.[0] || '0'}`,
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp();

    if (fullCommand) {
      embed.addFields({
        name: 'Full Command',
        value: `\`\`\`${fullCommand.substring(0, 1000)}\`\`\``,
        inline: false,
      });
    }

    if (args.length > 0) {
      embed.addFields({
        name: 'Arguments',
        value: `\`\`\`${args.join(' ').substring(0, 500)}\`\`\``,
        inline: false,
      });
    }

    if (executionTime !== null) {
      embed.addFields({
        name: 'Execution Time',
        value: `${executionTime}ms`,
        inline: true,
      });
    }

    await commandWebhook.send({
      username: `${client.user.username} Command Logger`,
      avatarURL: client.user.displayAvatarURL(),
      embeds: [embed],
    });
  } catch (error) {
    console.error('Failed to log command to webhook:', error);
  }
}

/**
 * Log error to webhook
 * @param {Object} client - Discord client
 * @param {Object} data - Error data
 */
async function logError(client, data) {
  if (!errorWebhook) return;

  try {
    const {
      error,
      context = 'Unknown',
      user = null,
      guild = null,
      channel = null,
      commandName = null,
      additionalInfo = null,
    } = data;

    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || 'No stack trace available';

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Error Occurred')
      .addFields(
        {
          name: 'Context',
          value: context,
          inline: true,
        },
        {
          name: 'Error Type',
          value: error?.name || 'Unknown',
          inline: true,
        },
        {
          name: 'Timestamp',
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true,
        },
        {
          name: 'Error Message',
          value: `\`\`\`${errorMessage.substring(0, 1000)}\`\`\``,
          inline: false,
        },
        {
          name: 'Stack Trace',
          value: `\`\`\`${errorStack.substring(0, 1500)}\`\`\``,
          inline: false,
        }
      )
      .setFooter({
        text: `${client.user.tag} | Shard: ${client.shard?.ids?.[0] || '0'}`,
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp();

    if (user) {
      embed.addFields({
        name: 'User',
        value: `${user.tag}\n\`${user.id}\``,
        inline: true,
      });
    }

    if (guild) {
      embed.addFields({
        name: 'Guild',
        value: `${guild.name}\n\`${guild.id}\``,
        inline: true,
      });
    }

    if (channel) {
      embed.addFields({
        name: 'Channel',
        value: `${channel.name || 'DM'}\n\`${channel.id || 'N/A'}\``,
        inline: true,
      });
    }

    if (commandName) {
      embed.addFields({
        name: 'Command',
        value: `\`${commandName}\``,
        inline: true,
      });
    }

    if (additionalInfo) {
      embed.addFields({
        name: 'Additional Info',
        value: `\`\`\`${String(additionalInfo).substring(0, 500)}\`\`\``,
        inline: false,
      });
    }

    // Add error code if available
    if (error?.code) {
      embed.addFields({
        name: 'Error Code',
        value: `\`${error.code}\``,
        inline: true,
      });
    }

    await errorWebhook.send({
      username: `${client.user.username} Error Logger`,
      avatarURL: client.user.displayAvatarURL(),
      embeds: [embed],
    });
  } catch (error) {
    console.error('Failed to log error to webhook:', error);
  }
}

module.exports = {
  logCommand,
  logError,
};

