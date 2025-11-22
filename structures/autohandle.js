const { EmbedBuilder, PermissionsBitField,ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, Component } = require("discord.js");
const color = require("colors");
const Reminder = require('../models/reminder');
const TempBan = require('../models/tempban');
const TempRole = require('../models/temprole');
const ReactionRoles = require('../models/ReactionRole');

async function remindme(client) {
    console.log(color.bold.red('==================+=================='));
    console.log(color.bold.yellow('✓ !! Remindme checker is running now, managing reminder smartly !! ⚡'));
  setInterval(async () => {
              try {
                  const currentTime = new Date();
                  const expiredReminders = await Reminder.find({ expireAt: { $lte: currentTime } });
  
                  for (const reminder of expiredReminders) {
                      const user = await client.users.fetch(reminder.userId).catch(() => null);
  
                      if (user) {
                          const embed = new EmbedBuilder()
                              .setColor('#ffcc00')
                              .setTitle('Reminder')
                              .setDescription(`Here is your reminder after **${reminder.duration}**`)
                              .addFields(
                                  { name: 'Message', value: reminder.message },
                                  { name: 'Channel', value: `<#${reminder.channelId}>` }
                              )
                              .setTimestamp();
  
                          try {
                              await user.send({ embeds: [embed] });
                              console.log(color.bold.yellow(`✓ [Reminder] !! Reminder sent to ${user.tag} ⚡`))
                              await Reminder.findByIdAndDelete(reminder._id).then(
                              console.log(color.bold.yellow(`✓ [Reminder] !! Reminder Deleted From Database ⚡`))
                              );
                          } catch (err) {
                              console.error(`Failed to send reminder to ${user.tag}:`, err.message)
                               await Reminder.findByIdAndDelete(reminder._id);
                          }
                      } else {
                          console.log(`User not found for reminder: ${reminder.userId}`)
                           await Reminder.findByIdAndDelete(reminder._id);
                      }
  
                      // Remove reminder from database
                      //await Reminder.findByIdAndDelete(reminder._id);
                  }
              } catch (err) {
                  console.error('Error in reminder checker:', err);
              }
          }, 10000);

}
async function temprole(client) {
    console.log(color.bold.yellow('✓ !! TempRole checker is running now, managing roles smartly !! ⚡'));
     setInterval(async () => {
        try {
            
            const expiredRoles = await TempRole.find({
                expireAt: { $lte: new Date() }
            });
    
            for (const tempRole of expiredRoles) {
                const guild = client.guilds.cache.get(tempRole.guildId);
                if (!guild) continue;
    
                const member = await guild.members.fetch(tempRole.userId).catch(() => null);
                if (!member) continue;
    
                const role = guild.roles.cache.get(tempRole.roleId);
                if (!role) continue;
    
                try {
                    await member.roles.remove(role);
                    await TempRole.findByIdAndDelete(tempRole._id);
    
                    // Try to notify the user
                    try {
                        await member.send({
                            embeds: [new EmbedBuilder()
                                .setAuthor({
                                    name: 'Temporary Role Expired',
                                    iconURL: member.user.displayAvatarURL({ dynamic: true })
                                })
                                .setDescription(`Your temporary role **${role.name}** in ${guild.name} has expired.`)
                                .setColor(process.env.color)]
                        });
                    } catch (err) {
                        // Ignore DM errors
                        console.log(`Could not DM user ${tempRole.userId} about role expiry`);
                    }
                } catch (err) {
                    console.error(`Error while processing expired role for user ${tempRole.userId} in guild ${tempRole.guildId}:`, err);
                }
            }
        } catch (err) {
            console.error('Error in temprole checker:', err);
        }
    }, 20000);
}
async function tempban(client) {
    console.log(color.bold.blue('✓ !! TempBan checker is running now, managing Bans Members smartly !! ⚡'));
    setInterval(async () => {
        try {
          
            const expiredBans = await TempBan.find({
                expireAt: { $lte: new Date() }
            });
  
            for (const ban of expiredBans) {
                const guild = client.guilds.cache.get(ban.guildId);
                if (!guild) continue;
  
                try {
                    await guild.members.unban(ban.userId, 'Temporary ban expired');
                    await TempBan.findByIdAndDelete(ban._id);
  
                    // Try to send notification to the user
                    try {
                        const user = await client.users.fetch(ban.userId);
                        await user.send({
                            embeds: [new EmbedBuilder()
                                .setAuthor({ name: 'Ban Expired' })
                                .setDescription(`Your temporary ban in ${guild.name} has expired.`)
                                .setColor(process.env.color)]
                        });
                    } catch (err) {
                        // Ignore DM errors
                        console.log(`Could not DM user ${ban.userId} about ban expiry`);
                    }
  
                } catch (err) {
                    console.error(`Error while processing expired ban for user ${ban.userId} in guild ${ban.guildId}:`, err);
                    await TempBan.findByIdAndDelete(ban._id).then(
                        console.log("TempBan Deleted By Force")
                    )
                }
            }
        } catch (err) {
            console.error('Error in tempban checker:', err);
        }
    }, 20000);
}

async function reactionrole(client) {
    console.log(color.bold.green('✓ !! ReactionRole checker is running now, managing Autoroles !! ⚡'));
    console.log(color.bold.red('==================+=================='));
    const panels = await ReactionRoles.find();
    let delay = 1000; // Start with 1 second delay
    for (const panel of panels) {
    try {
        const channel = client.channels.cache.get(panel.channelId);
        if (!channel) continue;

        const message = await channel.messages.fetch(panel.messageId).catch(() => null);
        if (!message) continue;

        //await message.reactions.removeAll().catch(() => null);
        
        for (const role of panel.roles) {
            await message.react(role.emoji).catch(e => {
                if (e.code === 429) delay = e.timeout || 2000;
                throw e;
            });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
         console.log(color.cyan.bold(`✓ [ReactionRole] 🚨 Restored panel For Message Id:- ${panel.messageId} 💕`));
    } catch (error) {
        console.error(`Error restoring panel ${panel.messageId}:`, error);
        // Increase delay on error
        delay = Math.min(delay * 2, 5000); // Cap at 5 seconds
    }
    // Add delay between panels
    await new Promise(resolve => setTimeout(resolve, 500));
}
    
}

module.exports = { remindme ,temprole,tempban,reactionrole};
