const { SlashCommandBuilder } = require('discord.js');
const PlayerManager = require('../playerManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show current song'),
  async execute(interaction, client) {
    const player = client.shoukaku.players.get(interaction.guildId);
    if (!player || !player.currentTrack) return interaction.reply({ content: 'Nothing playing!', flags: 64 });

    await PlayerManager.sendController(client, interaction.guildId, player.currentTrack, true);
    await interaction.reply({ content: '✅ Player controller updated!', flags: 64 });
  }
};
