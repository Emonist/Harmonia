const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const os = require('os');

module.exports = {
  name: 'nodestats',
  aliases: ['ns', 'nstats', 'node'],
  category: 'Developer',
  description: 'Check Lavalink node stats and system information',
  usage: 'nodestats',
  cooldown: 5000,
  ownerOnly: true,
  async execute(client, message, args, prefix) {
    try {
      // Check if user is bot owner
      if (!process.env.OWNER_ID || !process.env.OWNER_ID.includes(message.author.id)) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('❌ This command is only available to bot owners!')
          );
        return message.reply({ 
          components: [container], 
          flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
        });
      }

      // Get system information
      const sysInfo = {
        platform: os.platform(),
        arch: os.arch(),
        cpuCount: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'Unknown',
        totalMem: Math.round(os.totalmem() / 1024 / 1024), // MB
        freeMem: Math.round(os.freemem() / 1024 / 1024), // MB
        uptime: Math.round(os.uptime() / 3600), // Hours
      };

      // Get memory stats from memory monitor if available
      let memStats = {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      };
      
      if (client.memoryMonitor && typeof client.memoryMonitor.getMemoryStats === 'function') {
        memStats = client.memoryMonitor.getMemoryStats();
      } else {
        // Fallback to direct process.memoryUsage
        const memUsage = process.memoryUsage();
        memStats = {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024)
        };
      }

      // Get Lavalink node information
      let nodeInfo = [];
      let nodeStatus = '❌ No nodes connected';
      
      if (client.poru && client.poru.nodes) {
        const nodes = client.poru.nodes;
        if (nodes.size > 0) {
          nodeStatus = `✅ ${nodes.size} node(s) configured`;
          
          for (const [nodeName, node] of nodes) {
            try {
              const nodeData = {
                name: nodeName,
                host: node.host || 'Unknown',
                port: node.port || 'Unknown',
                connected: node.isConnected ? '✅ Connected' : '❌ Disconnected',
                players: node.stats?.players || 0,
                playingPlayers: node.stats?.playingPlayers || 0,
                uptime: node.stats?.uptime ? Math.round(node.stats.uptime / 1000 / 60) : 0, // minutes
                memory: node.stats?.memory ? {
                  used: Math.round((node.stats.memory.used || 0) / 1024 / 1024), // MB
                  free: Math.round((node.stats.memory.free || 0) / 1024 / 1024), // MB
                  allocated: Math.round((node.stats.memory.allocated || 0) / 1024 / 1024), // MB
                  reservable: Math.round((node.stats.memory.reservable || 0) / 1024 / 1024) // MB
                } : null,
                cpu: node.stats?.cpu ? {
                  cores: node.stats.cpu.cores || 0,
                  systemLoad: (node.stats.cpu.systemLoad * 100).toFixed(2) + '%',
                  lavalinkLoad: (node.stats.cpu.lavalinkLoad * 100).toFixed(2) + '%'
                } : null
              };
              
              nodeInfo.push(nodeData);
            } catch (nodeError) {
              console.error(`Error getting stats for node ${nodeName}:`, nodeError);
              nodeInfo.push({
                name: nodeName,
                error: nodeError.message || 'Unknown error'
              });
            }
          }
        }
      }

      // Get cache information
      const cacheInfo = {
        guilds: client.guilds.cache.size,
        users: client.users.cache.size,
        channels: client.channels.cache.size,
        emojis: client.emojis.cache.size,
        commands: client.commands ? client.commands.size : 0,
        slashCommands: client.slashCommands ? client.slashCommands.size : 0
      };

      // Build the response
      let response = `## 📊 Node Stats & System Information\n\n`;
      
      // System Information
      response += `### System Information\n`;
      response += `**Platform:** ${sysInfo.platform} (${sysInfo.arch})\n`;
      response += `**CPU:** ${sysInfo.cpuCount} cores (${sysInfo.cpuModel})\n`;
      response += `**Memory:** ${sysInfo.totalMem}MB total, ${sysInfo.freeMem}MB free\n`;
      response += `**System Uptime:** ${sysInfo.uptime} hours\n\n`;
      
      // Bot Memory Usage
      response += `### Bot Memory Usage\n`;
      response += `**RSS:** ${memStats.rss}MB\n`;
      response += `**Heap Used:** ${memStats.heapUsed}MB\n`;
      response += `**Heap Total:** ${memStats.heapTotal}MB\n`;
      response += `**External:** ${memStats.external}MB\n\n`;
      
      // Lavalink Nodes
      response += `### Lavalink Nodes\n`;
      response += `**Status:** ${nodeStatus}\n\n`;
      
      if (nodeInfo.length > 0) {
        for (const node of nodeInfo) {
          if (node.error) {
            response += `**${node.name}:** ❌ Error - ${node.error}\n\n`;
            continue;
          }
          
          response += `**${node.name}:** ${node.connected}\n`;
          response += `└ Host: ${node.host}:${node.port}\n`;
          response += `└ Players: ${node.players} (${node.playingPlayers} playing)\n`;
          
          if (node.uptime > 0) {
            response += `└ Uptime: ${node.uptime} minutes\n`;
          }
          
          if (node.memory) {
            response += `└ Memory: ${node.memory.used}MB used, ${node.memory.allocated}MB allocated\n`;
          }
          
          if (node.cpu) {
            response += `└ CPU: ${node.cpu.lavalinkLoad} load (${node.cpu.cores} cores)\n`;
          }
          
          response += `\n`;
        }
      }
      
      // Cache Information
      response += `### Cache Information\n`;
      response += `**Guilds:** ${cacheInfo.guilds}\n`;
      response += `**Users:** ${cacheInfo.users}\n`;
      response += `**Channels:** ${cacheInfo.channels}\n`;
      response += `**Emojis:** ${cacheInfo.emojis}\n`;
      response += `**Commands:** ${cacheInfo.commands}\n`;
      response += `**Slash Commands:** ${cacheInfo.slashCommands}\n`;

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(response));
      
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
      });
      
    } catch (error) {
      console.error('Error in nodestats command:', error);
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`❌ An error occurred while fetching node stats: ${error.message}`)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2 
      });
    }
  }
};