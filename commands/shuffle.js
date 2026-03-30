const { SlashCommandBuilder } = require('discord.js');
const { requirePlayer, requireSameVC, safeReply } = require('../utils/checks');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the active queue'),
  async execute(interaction, client) {
    const err = requirePlayer(interaction, client) || requireSameVC(interaction, client);
    if (err) return safeReply(interaction, err, true);

    const queueData = client.queue.get(interaction.guildId);
    if (!queueData || (queueData.active.length + queueData.backlog.length) < 2) {
      return safeReply(interaction, 'Queue too short to shuffle!', true);
    }

    // Combine active and backlog for a full shuffle
    const allTracks = [...queueData.active, ...queueData.backlog];

    // Fisher-Yates Shuffle
    for (let i = allTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allTracks[i], allTracks[j]] = [allTracks[j], allTracks[i]];
    }

    // Distribute back to active and backlog
    queueData.active = allTracks.slice(0, 10);
    queueData.backlog = allTracks.slice(10);

    await safeReply(interaction, `🔀 Shuffled **${allTracks.length}** tracks!`);
  }
};

