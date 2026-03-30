const { SlashCommandBuilder } = require('discord.js');
const { requirePlayer, requireSameVC, safeReply } = require('../utils/checks');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set player volume')
    .addIntegerOption(option => 
      option.setName('level')
        .setDescription('Volume level (0-150)')
        .setRequired(true)),
  async execute(interaction, client) {
    const err = requirePlayer(interaction, client) || requireSameVC(interaction, client);
    if (err) return safeReply(interaction, err, true);

    const level = interaction.options.getInteger('level');
    if (level < 0 || level > 150) return safeReply(interaction, 'Volume must be between 0 and 150!', true);

    const player = client.shoukaku.players.get(interaction.guildId);
    await player.setGlobalVolume(level);
    
    // Save to persistence
    if (!client.guildSettings.has(interaction.guildId)) client.guildSettings.set(interaction.guildId, {});
    client.guildSettings.get(interaction.guildId).volume = level;
    client.saveSettings();
    
    return safeReply(interaction, `🎵 Volume set to **${level}%** and saved.`);
  }
};

