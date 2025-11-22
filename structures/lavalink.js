const { Poru } = require('poru');
const { Spotify } = require('poru-spotify');
const GuildSettings = require('../models/guildSettings');
const color = require("colors");

// Convert Kazagumo node format to Poru format
const LavalinkNodes = [
    {
        name: 'Harmonia',
        host: '152.53.209.201',
        port: 2012,
        password: 'Suno',
        secure: false,
    },
];

module.exports = (client) => {
    // Clear any existing Poru instance to prevent memory leaks
    if (client.poru) {
        try {
            client.poru.removeAllListeners();
            if (client.poru.nodes) {
                client.poru.nodes.forEach(node => {
                    try {
                        node.removeAllListeners();
                    } catch (err) {}
                });
            }
        } catch (err) {
            console.error('Error cleaning up existing Poru:', err);
        }
    }

    // Promise-based connection tracking like Music-Bot-main
    let lavalinkConnected;
    const lavalinkPromise = new Promise((resolve) => {
        lavalinkConnected = resolve;
    });
    client.lavalinkPromise = lavalinkPromise;

    // Initialize Poru with Spotify plugin if configured
    const plugins = [];
    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
        plugins.push(
            new Spotify({
                clientID: process.env.SPOTIFY_CLIENT_ID,
                clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            })
        );
    }

    client.poru = new Poru(client, LavalinkNodes, {
        library: 'discord.js',
        defaultPlatform: 'ytsearch',
        resumeKey: 'HarmoniaMusicBot',
        resumeTimeout: 60,
        reconnectTimeout: 10000,
        reconnectTries: 5,
        plugins: plugins
    });

    // Set max listeners to prevent memory leak warnings
    client.poru.setMaxListeners(10);

    // Connection event - similar to Music-Bot-main's nodeConnect
    client.poru.on('nodeConnect', async (node) => {
        console.log('Poru node connected:', node.name, 'with resume key:', node.resumeKey);
        // Resolve the promise when first node connects (like Music-Bot-main)
        if (lavalinkConnected) {
            lavalinkConnected(node);
            lavalinkConnected = null;
        }
        console.log(color.bold.magenta('╔' + '═'.repeat(48) + '╗'));
        console.log(color.bold.red('║') + color.bold.green(`    Successfully Connected to Lavalink ${node.name}     `) + color.bold.red('║'));
        console.log(color.bold.red('║') + color.bold.green(`                                                `) + color.bold.red('║'));
        console.log(color.bold.magenta('╚' + '═'.repeat(48) + '╝'));

        try {
            // Use lean() for better performance and limit results
            const guilds = await GuildSettings.find({ alwaysOn: true }).lean().limit(50);

            for (const guildData of guilds) {
                try {
                    const guild = client.guilds.cache.get(guildData.guildId);
                    if (!guild) continue;

                    const channel = guild.channels.cache.get(guildData.voiceChannel);
                    if (!channel) continue;
                    
                    console.log(color.bold.green(`✓ Successfully Rejoining VC in ${guild.name} (${guild.id})`));

                    // Recreate player to stay in VC with retry logic
                    await createPlayerWithRetry(client, {
                        guildId: guild.id,
                        textChannel: guildData.textChannel,
                        voiceChannel: channel.id,
                        deaf: true,
                    }, 3);
                    
                    // Increased delay to prevent connection conflicts
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (guildError) {
                    console.error(`Error rejoining VC for guild ${guildData.guildId}:`, guildError);
                }
            }
        } catch (error) {
            console.error('Error processing alwaysOn guilds:', error);
        }
    });
    
    // Reconnect event - similar to Music-Bot-main
    client.poru.on('nodeReconnect', (node) => {
        console.log('Poru node reconnecting:', node.name);
        console.log(color.bold.yellow(`🔄 Lavalink node reconnecting: ${node.name}`));
    });

    client.poru.on('nodeError', (node, error) => {
        console.error('Poru node error for', node.name, ':', error);
        console.error(`❌ Lavalink ${node.name}: Error`, error.message || error);
        // Log more details for connection errors
        if (error.message && (error.message.includes('ECONNREFUSED') || error.message.includes('timeout'))) {
            console.error(color.bold.red(`💡 Connection Error Details:`));
            console.error(color.bold.yellow(`   - Check if Lavalink server is running at the configured address`));
            const nodeConfig = LavalinkNodes.find(n => n.name === node.name);
            console.error(color.bold.yellow(`   - Verify the host and port are correct: ${nodeConfig?.host || 'unknown'}:${nodeConfig?.port || 'unknown'}`));
            console.error(color.bold.yellow(`   - Check firewall and network settings`));
        }
    });

    client.poru.on('nodeDisconnect', (node) => {
        console.warn('Poru node disconnected:', node.name);
        console.warn(`⚠️ Lavalink ${node.name} disconnected!`);

        const reconnectTimeout = setTimeout(async () => {
            try {
                console.log(`🔄 Attempting to reconnect Lavalink ${node.name}...`);
                if (client.connectLavalinkNodes) {
                    await client.connectLavalinkNodes();
                }
            } catch (error) {
                console.error('Error during Lavalink reconnection:', error);
            }
        }, 5000);
        
        // Track timeout for cleanup
        if (client.activeTimeouts) {
            client.activeTimeouts.add(reconnectTimeout);
        }
    });

    // Helper function to check if nodes are available
    client.hasAvailableNode = () => {
        try {
            if (!client.poru || !client.poru.nodes) {
                return false;
            }
            const nodes = client.poru.nodes;
            if (!nodes || nodes.size === 0) {
                return false;
            }
            // Check if any node is connected
            for (const [nodeName, node] of nodes) {
                if (node && node.isConnected) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    };

    // Function to check and ensure nodes are connected - call this after client is ready
    client.connectLavalinkNodes = async (maxRetries = 10, retryDelay = 3000) => {
        try {
            if (!client.poru || !client.poru.nodes) {
                console.log(color.bold.red('❌ Poru or nodes not initialized'));
                return false;
            }

            const nodes = client.poru.nodes;
            if (!nodes || nodes.size === 0) {
                console.log(color.bold.red('❌ No nodes found. Check your node configuration.'));
                return false;
            }

            // Retry logic to wait for nodes to connect
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                console.log(color.bold.yellow(`🔄 Checking Lavalink nodes status... (Attempt ${attempt}/${maxRetries})`));
                
                let connectedCount = 0;
                let connectingCount = 0;

                for (const [nodeName, node] of nodes) {
                    try {
                        if (node.isConnected) {
                            console.log(color.bold.green(`✅ Node ${nodeName} is connected`));
                            connectedCount++;
                        } else {
                            console.log(color.bold.yellow(`⏳ Node ${nodeName} is connecting...`));
                            connectingCount++;
                        }
                    } catch (nodeError) {
                        console.error(color.bold.red(`❌ Error checking node ${nodeName}:`), nodeError.message);
                    }
                }
                
                // If at least one node is connected, we're good
                if (connectedCount > 0) {
                    console.log(color.bold.green(`✅ ${connectedCount} node(s) are connected and ready!`));
                    if (connectingCount > 0) {
                        console.log(color.bold.yellow(`⏳ ${connectingCount} node(s) are still connecting...`));
                    }
                    return true;
                }
                
                // If nodes are still connecting, wait and retry
                if (connectingCount > 0 && attempt < maxRetries) {
                    console.log(color.bold.yellow(`⏳ Waiting ${retryDelay/1000}s for nodes to connect...`));
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }
                
                // If no nodes are connecting and none are connected, something is wrong
                if (connectingCount === 0 && connectedCount === 0) {
                    console.log(color.bold.red('❌ No nodes are connecting. Check your Lavalink server status and configuration.'));
                    console.log(color.bold.yellow('💡 Verify:'));
                    console.log(color.bold.yellow('   - Lavalink server is running'));
                    console.log(color.bold.yellow('   - Node host and port are correct'));
                    console.log(color.bold.yellow('   - Authentication password matches'));
                    console.log(color.bold.yellow('   - Firewall allows connections'));
                    return false;
                }
            }
            
            // If we've exhausted all retries
            console.log(color.bold.red(`❌ Nodes failed to connect after ${maxRetries} attempts`));
            return false;
        } catch (error) {
            console.error(color.bold.red('❌ Error checking Lavalink nodes:'), error);
            return false;
        }
    };
};

// Helper function to create player with retry logic
async function createPlayerWithRetry(client, options, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log('Attempting to create player (attempt', attempt, 'of', maxRetries, '):', options.guildId);
            const player = client.poru.createConnection({
                guildId: options.guildId,
                voiceChannel: options.voiceChannel,
                textChannel: options.textChannel,
                deaf: options.deaf !== undefined ? options.deaf : true,
            });
            console.log('Player created successfully on attempt', attempt, ':', player.guildId);
            return player;
        } catch (error) {
            console.error(`❌ Player creation attempt ${attempt}/${maxRetries} failed for guild ${options.guildId}:`, error.message);
            
            if (attempt === maxRetries) {
                console.error(`❌ Failed to create player for guild ${options.guildId} after ${maxRetries} attempts`);
                throw error;
            }
            
            // Exponential backoff: wait longer between retries
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
