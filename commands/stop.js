const { SlashCommandBuilder } = require('discord.js');
const PlayerManager = require('../playerManager');
const { requirePlayer, requireSameVC, safeReply } = require('../utils/checks');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and leave VC'),
  async execute(interaction, client) {
    const err = requirePlayer(interaction, client) || requireSameVC(interaction, client);
    if (err) return safeReply(interaction, err, true);

    PlayerManager.cleanup(client, interaction.guildId);
    await client.shoukaku.leaveVoiceChannel(interaction.guildId).catch(() => {});
    await safeReply(interaction, '⏺ Stopped!');
  }
};
