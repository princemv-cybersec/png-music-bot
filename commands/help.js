const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { safeReply } = require('../utils/checks');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands'),
  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('🎵 PNG Music Bot — Help')
      .setDescription('All commands work as both `/slash` and `!prefix`.')
      .addFields(
        { name: '🎶 Playback', value: '`play` · `pause` · `resume` · `skip` · `skipto` · `seek` · `stop` · `nowplaying`', inline: false },
        { name: '📋 Queue', value: '`queue` · `shuffle` · `clearqueue` · `remove`', inline: false },
        { name: '⚙️ Settings', value: '`loop` (off/track/queue) · `volume` (0-150) · `autoplay` (radio mode) · `filter` (bassboost/nightcore/vaporwave/8d/reset)', inline: false },
        { name: '⭐ Favorites', value: '`favorite` (add/remove current track) · `favorites` (view list & play all)', inline: false },
        { name: '🔧 Utilities', value: '`history` · `ping` · `stats` · `help`', inline: false }
      )
      .setColor('#1DB954')
      .setFooter({ text: `${client.commands.size} commands available • Tip: Use /play [song name] to start!` });

    await safeReply(interaction, { embeds: [embed] });
  }
};
