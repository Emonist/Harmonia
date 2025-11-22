const { ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ComponentType, AttachmentBuilder } = require('discord.js');
const { hexToDecimal } = require('../../helpers/colorHelper');
const { MusicCard } = require('../../helpers/MusicCard');
const MusicCardSettings = require('../../models/MusicCardSettings');
const { logError } = require('../../helpers/webhookLogger');
const WeeklyLeaderboard = require('../../models/weeklyLeaderboard');
const MonthlyLeaderboard = require('../../models/monthlyLeaderboard');
const emojis = require('../../emoji.json');

// Use MusicCard from Music-Bot-main style
const musicCard = new MusicCard();

// Default config
const musicConfig = {
    ARTWORK_STYLE: 'MusicCard' 
};

function setupMusicEvents(client) {
    client.poru.on('trackStart', async (player, track) => {
        const channel = client.channels.cache.get(player.textChannel);
        if (!channel) return;

        player._lastPlayedTrack = track;
        
        if (player.currentTrack) {
            if (!player._previousTracks) player._previousTracks = [];
            player._previousTracks.push(player.currentTrack);
            if (player._previousTracks.length > 50) {
                player._previousTracks.shift();
            }
        }
        
        if (!player._autoplayHistory) {
            player._autoplayHistory = new Set();
        }
        if (track.info?.identifier) {
            player._autoplayHistory.add(track.info.identifier);
        }

        try {
            const trackTitle = track.info?.title || track.title || 'Unknown Title';
            const trackAuthor = track.info?.author || track.author || 'Unknown Artist';
            
            const now = new Date();
            const monday = new Date(now);
            monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
            monday.setHours(0, 0, 0, 0);
            const weeklyPeriod = monday.toISOString().split('T')[0];
            
            await WeeklyLeaderboard.findOneAndUpdate(
                { period: weeklyPeriod },
                {
                    $setOnInsert: { period: weeklyPeriod },
                    $inc: {
                        'tracks.$[elem].plays': 1
                    }
                },
                {
                    upsert: true,
                    arrayFilters: [
                        { 'elem.title': trackTitle, 'elem.author': trackAuthor }
                    ],
                    new: true
                }
            ).then(async (doc) => {
                const trackExists = doc.tracks.some(t => t.title === trackTitle && t.author === trackAuthor);
                if (!trackExists) {
                    await WeeklyLeaderboard.findOneAndUpdate(
                        { period: weeklyPeriod },
                        {
                            $push: {
                                tracks: {
                                    title: trackTitle,
                                    author: trackAuthor,
                                    plays: 1
                                }
                            }
                        }
                    );
                }
            }).catch(() => {}); 
            
            const monthlyPeriod = now.toISOString().substring(0, 7); // YYYY-MM
            
            await MonthlyLeaderboard.findOneAndUpdate(
                { period: monthlyPeriod },
                {
                    $setOnInsert: { period: monthlyPeriod },
                    $inc: {
                        'tracks.$[elem].plays': 1
                    }
                },
                {
                    upsert: true,
                    arrayFilters: [
                        { 'elem.title': trackTitle, 'elem.author': trackAuthor }
                    ],
                    new: true
                }
            ).then(async (doc) => {
                const trackExists = doc.tracks.some(t => t.title === trackTitle && t.author === trackAuthor);
                if (!trackExists) {
                    await MonthlyLeaderboard.findOneAndUpdate(
                        { period: monthlyPeriod },
                        {
                            $push: {
                                tracks: {
                                    title: trackTitle,
                                    author: trackAuthor,
                                    plays: 1
                                }
                            }
                        }
                    );
                }
            }).catch(() => {}); 
        } catch (err) {
            console.error('Error updating leaderboards:', err);
        }

        if (player.nowPlayingMessage && player.nowPlayingMessage.deletable) {
            try {
                await player.nowPlayingMessage.delete().catch(() => {});
            } catch (e) {}
            player.nowPlayingMessage = null;
        }

        if (player.updateInterval) clearInterval(player.updateInterval);

        if (player.buttonCollector) {
            try {
                player.buttonCollector.stop('newTrack');
            } catch (e) {}
            player.buttonCollector = null;
        }

        const nowPlayingText = `## ${emojis.music || '🎵'} Now Playing... \n[${track.info.title}](${track.info.uri}) \n\n`;

        function getFirstControlButtonRow(isPaused, disabled = false) {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('music_pause_resume')
                    .setEmoji(isPaused ? (emojis.resume || '▶️') : (emojis.pause || '⏸️'))
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setEmoji(emojis.skip || '⏭️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setEmoji(emojis.stop || '⏹️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setEmoji(emojis.loop || '🔁')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_autoplay')
                    .setEmoji(emojis.autoplay || '🔀')
                    .setStyle(player.autoplayEnabled ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(disabled)
            );
        }

        function getSecondControlButtonRow(disabled = false) {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('music_autoplay')
                    .setEmoji(emojis.autoplay || '🔀')
                    .setLabel('Autoplay')
                    .setStyle(player.autoplayEnabled ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setEmoji(emojis.loop || '🔁')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setEmoji(emojis.shuffle || '🔀')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('music_filter')
                    .setEmoji(emojis.filters || '🎛️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(disabled)
            );
        }

        let firstControlButtonRow = getFirstControlButtonRow(false, false);
        let secondControlButtonRow = getSecondControlButtonRow(false);

        const container = new ContainerBuilder();
        let musicCardAttachment = null;

        
        if (musicConfig.ARTWORK_STYLE === 'MusicCard') {
            
            try {
                let isLiked = false;
                try {
                    const trackIdentifier = track.info?.identifier || track.identifier;
                    if (trackIdentifier && track.info.requester?.id) {
                    }
                } catch (err) {}

                const guild = channel.guild;
                const guildIcon = guild?.iconURL({ extension: 'png', size: 128 });

                let cardStyle = 'large'; 
                try {
                    const settings = await MusicCardSettings.findOne({ guildId: guild.id });
                    if (settings) {
                        cardStyle = settings.cardStyle;
                    }
                } catch (err) {
                    console.error('Error fetching music card settings:', err);
                }

                const imageBuffer = await musicCard.generateNowPlayingCard({
                    track: track,
                    position: player.position || 0,
                    isLiked: isLiked,
                    guildName: guild?.name || 'Discord Server',
                    guildIcon: guildIcon,
                    player: player,
                    cardStyle: cardStyle
                });

                
                musicCardAttachment = new AttachmentBuilder(imageBuffer, { name: 'nowplaying.png' });

                
                container.addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems([new MediaGalleryItemBuilder().setURL('attachment://nowplaying.png')])
                );
            } catch (error) {
                console.error('Error generating MusicCard:', error);
            }
        } else {
            
            if (track.info.artworkUrl || track.info.image) {
                container.addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems([new MediaGalleryItemBuilder().setURL(track.info.artworkUrl || track.info.image)])
                );
            }
        }

        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(nowPlayingText));

        container
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addActionRowComponents(firstControlButtonRow)
            .addActionRowComponents(secondControlButtonRow)
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

        try {
            const GuildSettings = require('../../models/guildSettings');
            let controllerMessage = null;
            try {
                const guildSettings = await GuildSettings.findOne({ guildId: player.guildId });
                if (guildSettings?.musicController === channel.id && guildSettings?.musicControllerMessage) {
                    try {
                        controllerMessage = await channel.messages.fetch(guildSettings.musicControllerMessage).catch(() => null);
                    } catch (err) {
                    }
                }
            } catch (err) {
            }

            const messageOptions = {
                components: [container],
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
            };

            
            if (musicCardAttachment) {
                messageOptions.files = [musicCardAttachment];
            }

            let message;
            if (controllerMessage && controllerMessage.editable) {
                try {
                    await controllerMessage.edit(messageOptions);
                    message = controllerMessage;
                } catch (err) {
                    message = await channel.send(messageOptions);
                }
            } else {
                message = await channel.send(messageOptions);
            }
            
            player.nowPlayingMessage = message;
            
            try {
                const guildSettings = await GuildSettings.findOne({ guildId: player.guildId });
                if (guildSettings?.musicController === channel.id) {
                    guildSettings.musicControllerMessage = message.id;
                    await guildSettings.save().catch(() => {});
                }
            } catch (err) {
            }

            const filter = (i) => i.isButton() && i.message.id === message.id && i.guildId === player.guildId && i.customId.startsWith('music_');
            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter,
            });
            player.buttonCollector = collector;

            collector.on('collect', async (interaction) => {
                if (!interaction.member.voice.channelId || interaction.member.voice.channelId !== player.voiceChannel) {
                    const errorContainer = new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error || '❌'} You must be in the same voice channel as the bot!`));
                    return interaction.reply({ 
                        components: [errorContainer], 
                        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                        ephemeral: true 
                    });
                }

                try {
                    switch (interaction.customId) {
                        case 'music_pause_resume':
                        case 'music_pause': {
                            player.pause(!player.isPaused);
                            const state = player.isPaused ? `${emojis.pause || '⏸️'} Music paused.` : `${emojis.resume || '▶️'} Music resumed.`;
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(state));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            break;
                        }
                        case 'music_previous': {
                            if (!player._previousTracks || player._previousTracks.length === 0) {
                                const container = new ContainerBuilder()
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error || '❌'} No previous tracks!`));
                                return interaction.reply({ 
                                    components: [container], 
                                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                    ephemeral: true 
                                });
                            }
                            
                            const previousTrack = player._previousTracks.pop();
                            if (previousTrack) {
                                player.queue.unshift(previousTrack);
                                player.skip();
                                const container = new ContainerBuilder()
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.previous || '⏮️'} Playing previous track.`));
                                await interaction.reply({ 
                                    components: [container], 
                                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                    ephemeral: true 
                                });
                            }
                            break;
                        }
                        case 'music_skip': {
                            if (!player.currentTrack) {
                                const container = new ContainerBuilder()
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error || '❌'} Nothing to skip!`));
                                return interaction.reply({ 
                                    components: [container], 
                                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                    ephemeral: true 
                                });
                            }
                            player.skip();
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.skip || '⏭️'} Skipped the current track.`));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            break;
                        }
                        case 'music_stop': {
                            player.queue.clear();
                            player.destroy();
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.stop || '⏹️'} Stopped music and cleared the queue.`));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            break;
                        }
                        case 'music_loop': {
                            if (player.loop === 'NONE' || !player.loop) {
                                player.setLoop('TRACK');
                                var msg = `${emojis.loop || '🔁'} Loop track enabled.`;
                            } else if (player.loop === 'TRACK') {
                                player.setLoop('QUEUE');
                                var msg = `${emojis.repeat || '🔁'} Queue repeat enabled.`;
                            } else {
                                player.setLoop('NONE');
                                var msg = `${emojis.error || '❌'} Loop disabled.`;
                            }
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(msg));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            break;
                        }
                        case 'music_autoplay': {
                            player.autoplayEnabled = !player.autoplayEnabled;
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.autoplay || '🔀'} Autoplay ${player.autoplayEnabled ? 'enabled' : 'disabled'}.`));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            
                            break;
                        }
                        case 'music_lyrics': {
                            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                            
                            try {
                                if (!player.currentTrack) {
                                    const container = new ContainerBuilder()
                                        .addTextDisplayComponents(
                                            new TextDisplayBuilder().setContent(`${emojis.error || '❌'} No track is currently playing!`)
                                        );
                                    return interaction.editReply({ 
                                        components: [container], 
                                        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
                                    });
                                }

                                const track = player.currentTrack;
                                const container = new ContainerBuilder()
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(`${emojis.lyrics || '📝'} Lyrics feature - implement lyrics fetching here`)
                                    );
                                return interaction.editReply({ 
                                    components: [container], 
                                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
                                });
                            } catch (lyricsError) {
                                console.error('Error in lyrics button handler:', lyricsError);
                                try {
                                    const errorContainer = new ContainerBuilder()
                                        .addTextDisplayComponents(
                                            new TextDisplayBuilder().setContent(`${emojis.error || '❌'} An error occurred while fetching lyrics.`)
                                        );
                                    await interaction.editReply({ 
                                        components: [errorContainer], 
                                        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
                                    });
                                } catch (finalError) {
                                    console.error('Failed to send error message:', finalError);
                                }
                            }
                            break;
                        }
                        case 'music_queue': {
                            const currentPlayer = client.poru.players.get(interaction.guildId);
                            if (!currentPlayer || !currentPlayer.currentTrack) {
                                const container = new ContainerBuilder()
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error || '❌'} No music is currently playing!`));
                                return interaction.reply({ 
                                    components: [container], 
                                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                    ephemeral: true 
                                });
                            }
                            
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.queue || '📋'} Queue feature - implement queue display here`));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            break;
                        }
                        case 'music_shuffle': {
                            if (player.queue.length === 0) {
                                const container = new ContainerBuilder()
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.error || '❌'} The queue is empty!`));
                                return interaction.reply({ 
                                    components: [container], 
                                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                    ephemeral: true 
                                });
                            }
                            player.queue.shuffle();
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.shuffle || '🔀'} Queue shuffled.`));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            break;
                        }
                        case 'music_filter': {
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.filters || '🎛️'} Filter feature - implement filter menu here`));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            break;
                        }
                        case 'music_favorite_add': {
                            const container = new ContainerBuilder()
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.favorite || '❤️'} Favorite feature - implement favorite add here`));
                            await interaction.reply({ 
                                components: [container], 
                                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2, 
                                ephemeral: true 
                            });
                            break;
                        }
                    }
                } catch (error) {
                    console.error('Button interaction error:', error);
                    logError(client, {
                        error,
                        context: 'Music Player - Button Interaction',
                        additionalInfo: {
                            guildId: player.guildId,
                            customId: interaction.customId,
                            userId: interaction.user.id,
                        },
                    }).catch(() => {});
                }
            });

            
            player.updateInterval = setInterval(async () => {
                    if (!player.currentTrack || !player.nowPlayingMessage?.editable) {
                        clearInterval(player.updateInterval);
                        return;
                    }

                    const updatedFirstControlButtonRow = getFirstControlButtonRow(player.isPaused, false);
                    const updatedSecondControlButtonRow = getSecondControlButtonRow(false);

                    const updatedContainer = new ContainerBuilder();

                    let updatedMusicCardAttachment = null;

                    
                    if (musicConfig.ARTWORK_STYLE === 'MusicCard') {
                        
                        try {
                            let isLiked = false;
                            try {
                                const trackIdentifier = track.info?.identifier || track.identifier;
                                if (trackIdentifier && track.info.requester?.id) {
                                }
                            } catch (err) {}

                            const guild = channel.guild;
                            const guildIcon = guild?.iconURL({ extension: 'png', size: 128 });

                            let cardStyle = 'large'; 
                            try {
                                const settings = await MusicCardSettings.findOne({ guildId: guild.id });
                                if (settings) {
                                    cardStyle = settings.cardStyle;
                                }
                            } catch (err) {
                                console.error('Error fetching music card settings:', err);
                            }

                            const imageBuffer = await musicCard.generateNowPlayingCard({
                                track: track,
                                position: player.position || 0,
                                isLiked: isLiked,
                                guildName: guild?.name || 'Discord Server',
                                guildIcon: guildIcon,
                                player: player,
                                cardStyle: cardStyle
                            });

                            
                            updatedMusicCardAttachment = new AttachmentBuilder(imageBuffer, { name: 'nowplaying.png' });

                            updatedContainer.addMediaGalleryComponents(
                                new MediaGalleryBuilder().addItems([new MediaGalleryItemBuilder().setURL('attachment://nowplaying.png')])
                            );
                        } catch (error) {
                            console.error('Error updating MusicCard:', error);
                        }
                    } else {
                        
                        if (track.info.artworkUrl || track.info.image) {
                            updatedContainer.addMediaGalleryComponents(
                                new MediaGalleryBuilder().addItems([new MediaGalleryItemBuilder().setURL(track.info.artworkUrl || track.info.image)])
                            );
                        }
                    }
                    updatedContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(nowPlayingText));

                    updatedContainer
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                        .addActionRowComponents(updatedFirstControlButtonRow)
                        .addActionRowComponents(updatedSecondControlButtonRow)
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

                    try {
                        const editOptions = {
                            components: [updatedContainer],
                            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
                        };

                        
                        if (updatedMusicCardAttachment) {
                            editOptions.files = [updatedMusicCardAttachment];
                        }

                        await player.nowPlayingMessage.edit(editOptions);
                    } catch (e) {
                        clearInterval(player.updateInterval);
                    }
                }, 5000);
        } catch (e) {
            console.error('Error sending now playing message:', e);
            // Log error to webhook
            logError(client, {
                error: e,
                context: 'Music Player - Track Start',
                additionalInfo: {
                    guildId: player.guildId,
                    trackTitle: track?.info?.title || 'Unknown',
                },
            }).catch(() => {});
        }
    });

    client.poru.on('trackEnd', async (player, track, data) => {
        if (player.updateInterval) clearInterval(player.updateInterval);
    });

    client.poru.on('queueEnd', async (player) => {
        if (!player.autoplayEnabled) {
            return;
        }
        if (player.updateInterval) clearInterval(player.updateInterval);
        
        if (!player.autoplayEnabled) return;

        const lastTrack = player._lastPlayedTrack || player.currentTrack;
        
        if (!lastTrack || !lastTrack.info) return;

        try {
            const channel = client.channels.cache.get(player.textChannel);
            if (!channel) return;

            const trackTitle = lastTrack.info.title || '';
            const trackArtist = lastTrack.info.author || '';
            const trackUri = lastTrack.info.uri || '';
            
            let resolve;
            
            if (trackUri && trackUri.includes('youtube.com')) {
                resolve = await client.poru.resolve({ 
                    query: `https://music.youtube.com/watch?v=${lastTrack.info.identifier}&list=RD${lastTrack.info.identifier}`,
                    source: 'ytmsearch',
                    requester: lastTrack.info.requester 
                });
            }
            
            if (!resolve || !resolve.tracks || resolve.tracks.length === 0) {
                const searchQuery = `${trackTitle} ${trackArtist}`.trim();
                resolve = await client.poru.resolve({ 
                    query: searchQuery,
                    source: 'ytmsearch',
                    requester: lastTrack.info.requester 
                });
            }
            
            if (!resolve || !resolve.tracks || resolve.tracks.length === 0) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emojis.autoplay || '🔀'} Autoplay couldn't find related tracks. Use \`/play\` to add more songs!`)
                    );
                await channel.send({ 
                    components: [container], 
                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
                }).catch(() => {});
                return;
            }

            const maxAutoplayTracks = 6;
            const addedTracks = [];
            const seenTracks = new Set();
            
            const normalizeTitle = (title) => {
                return title.toLowerCase()
                    .replace(/\s*\(.*?\)\s*/g, '')
                    .replace(/\s*\[.*?\]\s*/g, '')
                    .replace(/[^\w\s]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            };
            
            const lastTrackNormalized = normalizeTitle(trackTitle);
            seenTracks.add(lastTrackNormalized);
            
            if (!player._autoplayHistory) {
                player._autoplayHistory = new Set();
            }
            
            for (const track of resolve.tracks) {
                if (addedTracks.length >= maxAutoplayTracks) break;
                
                const currentTitle = normalizeTitle(track.info?.title || '');
                const trackId = track.info?.identifier;
                
                if (trackId && player._autoplayHistory.has(trackId)) {
                    continue;
                }
                
                if (!seenTracks.has(currentTitle) && currentTitle && track.info?.author) {
                    addedTracks.push(track);
                    seenTracks.add(currentTitle);
                }
            }
            
            if (addedTracks.length === 0) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emojis.autoplay || '🔀'} Autoplay found only duplicates. Use \`/play\` to add more songs!`)
                    );
                await channel.send({ 
                    components: [container], 
                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
                }).catch(() => {});
                return;
            }

            for (const track of addedTracks) {
                player.queue.add(track);
            }
            
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `${emojis.autoplay || '🔀'} **Autoplay Active**\n\n` +
                        `Added ${addedTracks.length} similar track${addedTracks.length > 1 ? 's' : ''} to queue\n` +
                        `Based on: **${trackTitle}**`
                    )
                );
            await channel.send({ 
                components: [container], 
                flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
            }).catch(() => {});
            
            if (player.isConnected && !player.isPlaying) {
                try {
                    player.play();
                } catch (err) {
                    console.error('[Autoplay] Error starting playback:', err);
                }
            }
            
        } catch (error) {
            console.error('[Autoplay] Error:', error);
            
            // Log error to webhook
            logError(client, {
                error,
                context: 'Music Player - Autoplay',
                additionalInfo: {
                    guildId: player.guildId,
                    lastTrack: lastTrack?.info?.title || 'Unknown',
                },
            }).catch(() => {});
            
            const channel = client.channels.cache.get(player.textChannel);
            if (channel) {
                const container = new ContainerBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emojis.error || '❌'} Autoplay encountered an error. Use \`/play\` to continue!`)
                    );
                await channel.send({ 
                    components: [container], 
                    flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
                }).catch(() => {});
            }
        }
    });

    client.poru.on('playerDestroy', (player) => {
        if (player.updateInterval) clearInterval(player.updateInterval);
        if (player.buttonCollector) {
            try {
                player.buttonCollector.stop();
            } catch (e) {}
        }
        if (player._autoplayHistory) {
            player._autoplayHistory.clear();
        }
    });
}

module.exports = { setupMusicEvents };

