const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { inspect } = require(`util`);
const load = require("lodash");
module.exports = {
  name: 'servers',
  aliases: ['serverlist','guildlist'],
  description: 'Owners Cmds',
  category: 'Utility',
  cooldown: 5000,
  owner:true,
  async execute(client, message,args,prefix) {
    // let count = 0;
    //     const serverlist = client.guilds.cache.map( (guild, i) =>{
    //     count++;
    //     return `**${count} :- [\`${guild.name}\`](https://discord.gg/devhaven) |ID: \`${guild.id}\`\n Member : \`${guild.memberCount}\`**`
    // });
    let count = 0;
let guildsData = [];

// Fetch guild data asynchronously
async function fetchGuildData() {
    for (const guild of client.guilds.cache.values()) {
        count++;
        const owner = await guild.fetchOwner().catch(() => null); // Fetch guild owner
        let invite = "https://discord.gg/devhaven";

        // Fetch existing invite if available
        const invites = await guild.invites.fetch().catch(() => new Map());
        if (invites.size > 0) {
            invite = invites.first().url; // Use the first available invite link
        }

        // guildsData.push(
        //     `**${count} :- \`${guild.name}\` | Member : ${guild.memberCount}\n` +
        //     `👑 Owner: ${owner?.user?.tag || 'Unknown'} (\`${owner?.id || 'Unknown'}\`)\n` +
        //     `ID: \`${guild.id}\`\n` +
        //     `🔗 [Invite](${invite})**`
        // );
        guildsData.push(`**${count} :- [\`${guild.name}\`](${invite}) |ID: \`${guild.id}\`\n[\`${owner?.user?.tag || 'Unknown'}\`](https://discord.gg/devhaven) - Member : \`${guild.memberCount}\`**`)
    }
    return guildsData;
}
const serverlist = await fetchGuildData();
        const mapping = load.chunk(serverlist, 10);
        const pages = mapping.map((s) => s.join("\n"));
        let page = 0;

        if (client.guilds.cache.size <= 10) {

            const embed = new EmbedBuilder()
            .setColor(process.env.color)
            .setDescription(pages[page])
            .setFooter({
                text: `Page ${page + 1}/${pages.length}`,
                iconURL: message.author.displayAvatarURL({
                    dynamic: true,
                }),
            })
            .setTitle(`Now ${client.user.username} Is in ${client.guilds.cache.size} Guilds`);
            return await message.channel.send({
                embeds: [embed]
            });
    
        } else {

        const embed2 = new EmbedBuilder()
            .setColor(process.env.color)
            .setDescription(pages[page])
            .setFooter({
                text: `Page ${page + 1}/${pages.length}`,
                iconURL: message.author.displayAvatarURL({
                    dynamic: true,
                }),
            })
            .setTitle(`${client.user.username} Server List`);

        const but1 = new ButtonBuilder().setCustomId("server_list_next").setEmoji("<:emoji_48:1155863883991486494>").setStyle(ButtonStyle.Primary);

        const but2 = new ButtonBuilder().setCustomId("server_list_previous").setEmoji("<:emoji_49:1155863920616144927>").setStyle(ButtonStyle.Primary);

        const but3 = new ButtonBuilder().setCustomId("server_list_stop").setEmoji("<:Harmonia:1224417132289462335>").setStyle(ButtonStyle.Danger);

        const disbut = new ButtonBuilder().setDisabled(true).setCustomId("disabled").setEmoji("<:emoji_48:1155863883991486494>").setStyle(ButtonStyle.Primary);

        const disbut1 = new ButtonBuilder().setDisabled(true).setCustomId("disabled1").setEmoji("<:emoji_49:1155863920616144927>").setStyle(ButtonStyle.Primary);

        const disbut2 = new ButtonBuilder().setDisabled(true).setCustomId("disabled2").setEmoji("<:Harmonia:1224417132289462335> ").setStyle(ButtonStyle.Danger);

        const row1 = new ActionRowBuilder().addComponents([but2, but3, but1]);

        const msg = await message.channel.send({
            embeds: [embed2],
            components: [row1],
        });

        const collector = message.channel.createMessageComponentCollector({
            filter: (b) => {
                if (b.user.id === message.author.id) return true;
                else {
                    b.reply({
                        ephemeral: true,
                        content: `Only **${message.author.tag}** can use this button, if you want then you've to run the command again.`,
                    });
                    return false;
                }
            },
            time: 60000 * 5,
            idle: 60000 * 2
        });

        collector.on("collect", async (button) => {
            if (button.customId === "server_list_next") {
                await button.deferUpdate().catch(() => {});
                page = page + 1 < pages.length ? ++page : 0;

                const embed3 = new EmbedBuilder()
                    .setColor(process.env.color)
                    .setDescription(pages[page])
                    .setFooter({
                        text: `Page ${page + 1}/${pages.length}`,
                        iconURL: message.author.displayAvatarURL({
                            dynamic: true,
                        }),
                    })
                    .setTitle(`${client.user.username} Server List`);

                await msg.edit({
                    embeds: [embed3],
                    components: [row1],
                });
            } else if (button.customId === "server_list_previous") {
                await button.deferUpdate().catch(() => {});
                page = page > 0 ? --page : pages.length - 1;

                const embed4 = new EmbedBuilder()
                    .setColor(process.env.color)
                    .setDescription(pages[page])
                    .setFooter({
                        text: `Page ${page + 1}/${pages.length}`,
                        iconURL: message.author.displayAvatarURL({
                            dynamic: true,
                        }),
                    })
                    .setTitle(`${client.user.username} Server List`);

                await msg
                    .edit({
                        embeds: [embed4],
                        components: [row1],
                    })
                    .catch(() => {});
            } else if (button.customId === "server_list_stop") {
                await button.deferUpdate().catch(() => {});
                collector.stop();
            } else return;
        });

        collector.on("end", async () => {
            await msg.edit({
                components: [
                    new ActionRowBuilder().addComponents([disbut1, disbut2, disbut]),
                  ],
            });
        });
        }
  },
};
