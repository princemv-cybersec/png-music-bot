const { SlashCommandBuilder } = require('discord.js');
const { requirePlayer, requireSameVC, safeReply } = require('../utils/checks');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Jump to a specific timestamp in the track (mm:ss)')
    .addStringOption(option => 
      option.setName('time')
        .setDescription('The time to seek to (e.g., 2:30 or 150)')
        .setRequired(true)),
  async execute(interaction, client) {
    const err = requirePlayer(interaction, client) || requireSameVC(interaction, client);
    if (err) return safeReply(interaction, err, true);

    const player = client.shoukaku.players.get(interaction.guildId);
    const timeStr = interaction.options.getString('time');
    let ms = 0;

    // Support both mm:ss and raw seconds
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        ms = (parts[0] * 60 + parts[1]) * 1000;
      } else if (parts.length === 3) {
        ms = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
      }
    } else {
      ms = Number(timeStr) * 1000;
    }

    if (isNaN(ms) || ms < 0 || ms > player.currentTrack.info.length) {
      return safeReply(interaction, 'Invalid time provided!', true);
    }

    await player.seekTo(ms);
    await safeReply(interaction, `⏩ Seeked to **${client.formatTime(ms)}**`);
  },
};

