const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearqueue')
    .setDescription('Clear the entire queue'),
  async execute(interaction, client) {
    const queueData = client.queue.get(interaction.guildId);
    if (queueData) {
      queueData.active = [];
      queueData.backlog = [];
    }
    await interaction.reply({ content: '🗑️ Queue cleared!' });
  }
};
