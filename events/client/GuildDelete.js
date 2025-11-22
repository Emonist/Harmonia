const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const dev = "1383706658315960330";

const storePath = path.join(__dirname, "../../notified_guilds.json");

function getNotifiedGuilds() {
    if (!fs.existsSync(storePath)) return [];
    try {
        return JSON.parse(fs.readFileSync(storePath, "utf8"));
    } catch {
        return [];
    }
}

function addNotifiedGuild(guildId) {
    let notified = getNotifiedGuilds();
    if (!notified.includes(guildId)) {
        notified.push(guildId);
        fs.writeFileSync(storePath, JSON.stringify(notified, null, 2), "utf8");
    }
}

module.exports = {
    name: "guildDelete",
    async execute(client, guild) {
        // 1. Check if this guild has already been notified
        const notifiedGuilds = getNotifiedGuilds();
        if (notifiedGuilds.includes(guild.id)) return;

        try {
            let owner = await guild?.fetchOwner().catch(() => null);
            let ownerTag = owner?.user?.tag || "Unknown";
            let ownerId = owner?.user?.id || "Unknown";
            const user = await client.users.fetch(dev);

            let eme = new EmbedBuilder()
                .setColor(process.env.color)
                .setAuthor({ name: "| GUILD LEFT", iconURL: client.user.displayAvatarURL() })
                .setDescription(
                    `**Server Name** : **\`\`\`yml\n${guild.name} | (${guild.id})\`\`\`**
**Owner Info** : **\`\`\`yml\n${ownerTag} | (${ownerId})\`\`\`**
**MemberCount** :  **\`\`\`yml\n${guild.memberCount} Members\`\`\`**
**Servers Count** :  **\`\`\`yml\n${client.guilds.cache.size}\`\`\`**
**Guild Created :** **<t:${Math.round(guild.createdTimestamp/1000)}:R>** | **Guild Joined :** **<t:${Math.round(guild.joinedTimestamp/1000)}:R>**
**Total Users Count** : **\`\`\`yml\n${client.guilds.cache.reduce((a,b) => a + b.memberCount,0)}\`\`\`**`
                )
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .setTimestamp();

            // Send to log channel
            client.channels.cache.get(process.env.guild_log)?.send({ embeds: [eme] });

            // Send DM to dev
            user.send({ embeds: [eme] });

            // 2. Mark this guild as notified
            addNotifiedGuild(guild.id);

            // Update Top.gg server count
            if (client.topgg) {
                await client.topgg.postStats(client.guilds.cache.size);
            }

        } catch (e) {
            if (e.code == `FetchOwnerId`) {
                return;
            } else {
                console.error(e);
            }
            
            // Still try to update Top.gg server count even if there was an error
            if (client.topgg) {
                await client.topgg.postStats(client.guilds.cache.size);
            }
        }
    },
};