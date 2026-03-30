const { SlashCommandBuilder } = require('discord.js');
const PlayerManager = require('../playerManager');
const { requirePlayer, requireSameVC, safeReply } = require('../utils/checks');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip current track'),
  async execute(interaction, client) {
    const err = requirePlayer(interaction, client) || requireSameVC(interaction, client);
    if (err) return safeReply(interaction, err, true);

    const player = client.shoukaku.players.get(interaction.guildId);

    // Anti-Spam: 2 second cooldown
    const now = Date.now();
    const lastSkip = client.skipCooldowns?.get(interaction.guildId) || 0;
    if (now - lastSkip < 2000) {
      return safeReply(interaction, '⏸️ Slow down! You are skipping too fast.', true);
    }
    if (!client.skipCooldowns) client.skipCooldowns = new Map();
    client.skipCooldowns.set(interaction.guildId, now);

    await PlayerManager.playNext(client, interaction.guildId, player.currentTrack, true, 'command:skip');
    await safeReply(interaction, '⏭️ Skipped!');
  }
};

