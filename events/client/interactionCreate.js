const GuildSettings = require('../../models/guildSettings');
const { EmbedBuilder } = require('discord.js');
const WelcomeSettings = require('../../models/WelcomeSchema');
const { REST } = require("@discordjs/rest");
const { logCommand, logError } = require('../../helpers/webhookLogger');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    // Modal Submit Handling (unchanged)
    if (interaction.isModalSubmit()) {
      const guildID = interaction.guild.id;
      const settings =
        (await WelcomeSettings.findOne({ guildID })) ||
        new WelcomeSettings({ guildID });

      if (interaction.customId === 'embed_message_modal') {
        settings.embed.enabled = true;
        settings.embed.embedOptions.title =
          interaction.fields.getTextInputValue('title');
        settings.embed.embedOptions.description =
          interaction.fields.getTextInputValue('description');
        settings.embed.embedOptions.footer =
          interaction.fields.getTextInputValue('footer');
        settings.embed.embedOptions.author =
          interaction.fields.getTextInputValue('author');
        settings.embed.message =
          interaction.fields.getTextInputValue('unembedded');
        await settings.save();
        return interaction.reply({
          content: '✅ Embed welcome message updated!',
          ephemeral: true,
        });
      }

      if (interaction.customId === 'embed_url_modal') {
        settings.embed.embedOptions.image =
          interaction.fields.getTextInputValue('image_url');
        settings.embed.embedOptions.thumbnail =
          interaction.fields.getTextInputValue('thumbnail_url');
        settings.embed.embedOptions.authorAvatar =
          interaction.fields.getTextInputValue('author_url');
        settings.embed.embedOptions.color =
          interaction.fields.getTextInputValue('color');
        settings.embed.embedOptions.url =
          interaction.fields.getTextInputValue('title_url');
        await settings.save();
        return interaction.reply({
          content: '✅ Embed URLs updated!',
          ephemeral: true,
        });
      }
    }

    // Check if music system is ready
    if (!client.poru?.players) {
      return interaction.reply({
        content: '⚠️ Music system is still initializing. Please wait a moment.',
        ephemeral: true,
      });
    }

    // Command Handling (unchanged)
    if (interaction.isCommand()) {
      const settings = await GuildSettings.findOne({
        guildId: interaction.guild.id,
      });
      if (settings?.ignoredChannels?.includes(interaction.channel.id)) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('🚫 Ignored Channel')
          .setDescription(
            'This channel is **ignored**, and commands will not work here.',
          );

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      const command = client.slashCommands.get(interaction.commandName);
      if (command) {
        const startTime = Date.now();
        try {
          await command.execute(client, interaction);
          
          // Log successful slash command execution
          const executionTime = Date.now() - startTime;
          const args = interaction.options?.data?.map(opt => {
            if (opt.value) return `${opt.name}:${opt.value}`;
            return opt.name;
          }) || [];
          
          await logCommand(client, {
            commandName: interaction.commandName,
            user: interaction.user,
            guild: interaction.guild,
            channel: interaction.channel,
            fullCommand: `/${interaction.commandName} ${args.join(' ')}`,
            isSlash: true,
            args: args,
            executionTime: executionTime,
          });
        } catch (error) {
          console.error('Command Execution Error:', error);
          
          // Log error to webhook
          await logError(client, {
            error,
            context: 'Slash Command Execution',
            user: interaction.user,
            guild: interaction.guild,
            channel: interaction.channel,
            commandName: interaction.commandName,
            additionalInfo: {
              commandType: 'Slash Command',
              options: interaction.options?.data || [],
            },
          });
          
          await interaction.reply({
            content: '⚠️ Command failed to execute.',
            ephemeral: true,
          }).catch(() => {
            // If already replied, try to follow up
            interaction.followUp({
              content: '⚠️ Command failed to execute.',
              ephemeral: true,
            }).catch(() => {});
          });
        }
      }
    }

    // Button Interaction Handling
    if (interaction.isButton() && interaction.customId.startsWith('music_')) {
      const player = client.poru.players.get(interaction.guild.id);
      if (!player) {
        return interaction.reply({
          content: '🚫 No active music session found!',
          ephemeral: true,
        });
      }

      // Check if user is in the same VC as the bot
      
      const memberVoiceChannel = interaction.member?.voice?.channel;
      const botVoiceChannel = interaction.guild.members?.me?.voice?.channel;
      if (!botVoiceChannel) {
        player.destroy();
        return interaction.reply({
          content: 'Bot is not in any voice channel. Player has been destroyed.',
          ephemeral: true,
        });
      }
      if (!memberVoiceChannel || memberVoiceChannel.id !== botVoiceChannel?.id) {
        return interaction.reply({
          content: '🚫 You must be in the same voice channel as the bot to use music controls!',
          ephemeral: true,
        });
      }

      const action = interaction.customId.replace('music_', '');
      if (!action) {
        return interaction.reply({
          content: '⚠️ Invalid button action.',
          ephemeral: true,
        });
      }

      try {
        switch (action) {
          case 'pause':
            player.pause(!player.isPaused);
            await interaction.reply({
              content: `⏯️ Player ${player.isPaused ? 'paused' : 'resumed'}.`,
              ephemeral: true,
            });
            break;

          case 'skip':
            player.skip();
            await interaction.reply({
              content: `⏭️ Track skipped.`,
              ephemeral: true,
            });
            break;

          case 'stop':
            const rest = new REST({
              version: "10"
            }).setToken(process.env.TOKEN);
            
            let vc = client.channels.cache.get(player.voiceChannel);
            const channel = client.channels.cache.get(player.textChannel);
            if (!channel) return;
          
            // Update voice channel status when song starts
            try {
              if (vc) {
                await rest.put(`/channels/${vc.id}/voice-status`, {
                  body: {
                    status: ``,
                  },
                });
              }
            } catch (voiceError) {
              console.error('❌ Voice Status Update Error:', voiceError);
            }
            player.destroy();
            await interaction.reply({
              content: '⏹️ Music stopped.',
            //  components: [],
              ephemeral: true,
            });
            break;

          case 'autoplay':
            const settings = await GuildSettings.findOne({
              guildId: interaction.guild.id,
            }) || new GuildSettings({ guildId: interaction.guild.id });
            settings.autoplay = !settings.autoplay; 
            await settings.save();
            await interaction.reply({
              content: `🔁 Autoplay ${settings.autoplay ? 'enabled' : 'disabled'}.`,
              ephemeral: true,
            });
            break;

          case 'loop':
            const modes = ['none', 'track', 'queue'];
            const nextMode =
              modes[(modes.indexOf(player.loop) + 1) % modes.length];
            player.setLoop(nextMode);
            await interaction.reply({
              content: `🔁 Loop mode set to **${nextMode}**.`,
              ephemeral: true,
            });
            break;

          default:
            await interaction.reply({
              content: '⚠️ Unknown action encountered.',
              ephemeral: true,
            });
            break;
        }
      } catch (error) {
        console.error('Button Interaction Error:', error);
        
        // Log error to webhook
        await logError(client, {
          error,
          context: 'Button Interaction',
          user: interaction.user,
          guild: interaction.guild,
          channel: interaction.channel,
          additionalInfo: {
            customId: interaction.customId,
            action: action,
          },
        }).catch(() => {});
        
        await interaction.reply({
          content: '⚠️ Button action failed.',
          ephemeral: true,
        });
      }
    }
  },
};