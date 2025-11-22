const fs = require('fs');
const logger = require('../helpers/logger');

module.exports = (client) => {
  logger.section('Loading Events');
  
  const eventFolders = fs.readdirSync('./events');
  let totalEvents = 0;
  let loadedEvents = 0;
  
  for (const folder of eventFolders) {
    logger.subsection(`Loading from ${folder}`);
    
    const eventFiles = fs
      .readdirSync(`./events/${folder}`)
      .filter((file) => file.endsWith('.js'));

    totalEvents += eventFiles.length;

    for (const file of eventFiles) {
      try {
        const event = require(`../events/${folder}/${file}`);
        client.on(event.name, (...args) => event.execute(client, ...args));
        loadedEvents++;
        logger.success(`Loaded: ${event.name}`, `${folder}/${file}`);
      } catch (error) {
        logger.errorWithStack(`Failed to load ${file} in ${folder}`, error);
      }
    }
  }
   
  logger.blank();
  logger.table([
    { key: 'Total Events Found', value: `${totalEvents}`, color: 'cyan' },
    { key: 'Successfully Loaded', value: `${loadedEvents}`, color: 'green' },
    { key: 'Failed', value: `${totalEvents - loadedEvents}`, color: totalEvents - loadedEvents > 0 ? 'red' : 'green' },
  ]);
};
