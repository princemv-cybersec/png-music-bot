const { ActivityType, REST, Routes } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'clientReady', // Correct event name for Discord.js v14+
  once: true,
  async execute(client) {
    console.log(`[Client] Logged in as ${client.user.tag}`);
    client.user.setActivity({
      name: '/play | !play',
      type: ActivityType.Listening
    });

    // Register Slash Commands
    const rest = new REST({ version: '10' }).setToken(config.token);
    try {
      const commands = Array.from(client.commands.values()).map(c => c.data.toJSON());
      
      // Clear guild-level commands to remove duplicates
      for (const guild of client.guilds.cache.values()) {
        await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: [] })
          .catch(() => null);
      }
      
      // Register only as global commands
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log(`[Discord] Registered ${commands.length} global commands. Cleared guild commands from ${client.guilds.cache.size} guilds.`);
    } catch (error) {
      console.error('[Discord] Error registering slash commands:', error);
    }
  }
};
