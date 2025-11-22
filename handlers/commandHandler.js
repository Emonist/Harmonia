const fs = require('fs');
const path = require('path');
const logger = require('../helpers/logger');

module.exports = async (client) => {
  const slashCommandsArray = [];
  let messageCommandCount = 0;

  // Function to load commands from a directory
  const loadCommands = (baseDir, isSlash = false) => {
    const commandPath = path.join(__dirname, baseDir);

    // Skip if folder doesn't exist
    if (!fs.existsSync(commandPath)) {
      logger.warning(`Directory "${baseDir}" not found`);
      return;
    }

    const commandFolders = fs.readdirSync(commandPath);

    for (const folder of commandFolders) {
      const folderPath = path.join(commandPath, folder);

      // Ensure it's a directory
      if (!fs.statSync(folderPath).isDirectory()) continue;

      const commandFiles = fs
        .readdirSync(folderPath)
        .filter((file) => file.endsWith('.js'));

      for (const file of commandFiles) {
        const command = require(path.join(folderPath, file));

        if (isSlash) {
          // Load Slash Commands
          if (command.data) {
            client.slashCommands.set(command.data.name, command);
            slashCommandsArray.push(command.data.toJSON());
            //console.log(`✅ Loaded Slash Command: ${command.data.name}`);
          }
        } else {
          // Load Message Commands
          if (command.name) {
            client.commands.set(command.name, command);
            messageCommandCount++;
            //console.log(`✅ Loaded Message Command: ${command.name}`);
          }
        }
      }
    }
  };

  loadCommands('../commands');
  loadCommands('../slash', true);
  
  logger.section('Commands Loaded');
  logger.table([
    { key: 'Message Commands', value: `${messageCommandCount}`, color: 'cyan' },
    { key: 'Slash Commands', value: `${slashCommandsArray.length}`, color: 'cyan' },
  ]);
  
  // Register global slash commands
  client.once('ready', async () => {
    try {
      await client.application.commands.set(slashCommandsArray);
      logger.success(`Registered ${slashCommandsArray.length} slash commands globally`);
    } catch (error) {
      logger.errorWithStack('Failed to register slash commands', error);
    }
  });
  // To delete slash

  /**client.once('ready', async () => {
  try {
    // Fetch all global application commands
    const commands = await client.application.commands.fetch();
    // Delete each command
    for (const command of commands.values()) {
      await client.application.commands.delete(command.id);
      console.log(`Deleted global command: ${command.name}`);
    }
    console.log('✅ All global slash commands deleted.');
  } catch (error) {
    console.error('Error deleting global commands:', error);
  }
}); **/

// End Of Slash delete

};
