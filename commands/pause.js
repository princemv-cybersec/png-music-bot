const { SlashCommandBuilder } = require('discord.js');
const { requirePlayer, requireSameVC, safeReply } = require('../utils/checks');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause playback'),
  async execute(interaction, client) {
    const err = requirePlayer(interaction, client) || requireSameVC(interaction, client);
    if (err) return safeReply(interaction, err, true);

    const player = client.shoukaku.players.get(interaction.guildId);
    if (player.paused) return safeReply(interaction, 'Already paused!', true);

    await player.setPaused(true);
    await safeReply(interaction, '⏸️ Paused!');
  }
};

