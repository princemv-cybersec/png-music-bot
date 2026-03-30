const { SlashCommandBuilder } = require('discord.js');
const PlayerManager = require('../playerManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Apply audio filters to the music')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Select a filter type')
        .setRequired(true)
        .addChoices(
          { name: 'Bassboost', value: 'bassboost' },
          { name: 'Nightcore', value: 'nightcore' },
          { name: 'Vaporwave', value: 'vaporwave' },
          { name: '8D', value: '8d' },
          { name: 'Reset', value: 'reset' }
        )),
  async execute(interaction, client) {
    const type = interaction.options.getString('type');
    const player = client.shoukaku.players.get(interaction.guildId);

    if (!player) return interaction.reply({ content: 'Nothing is currently playing.', flags: 64 });

    await interaction.deferReply();
    
    try {
      const typeStr = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Reset';
      await PlayerManager.setFilters(player, type || 'reset', client);
      await interaction.editReply(`✨ Filter applied: **${typeStr}**`);
    } catch (error) {
      console.error(`[Filter] ${interaction.guildId} Error:`, error);
      await interaction.editReply('❌ Failed to apply filter.');
    }
  }
};
