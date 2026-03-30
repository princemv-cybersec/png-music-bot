const { SlashCommandBuilder } = require('discord.js');
const PlayerManager = require('../playerManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skipto')
    .setDescription('Skip directly to a song in the queue')
    .addIntegerOption(option => 
      option.setName('index')
        .setDescription('The index of the song to skip to (see /queue)')
        .setRequired(true)),
  async execute(interaction, client) {
    const index = interaction.options.getInteger('index');
    const queueData = client.queue.get(interaction.guildId);
    const player = client.shoukaku.players.get(interaction.guildId);

    if (!queueData || !player) return interaction.reply({ content: 'Nothing is currently playing.', flags: 64 });

    if (index < 1 || index > (queueData.active.length + queueData.backlog.length)) {
       return interaction.reply({ content: 'Invalid index. Check the queue for valid numbers.', flags: 64 });
    }

    // Move tracks to the front
    if (index <= queueData.active.length) {
      // Index 1 is active[0], Index 2 is active[1]
      // To skip TO index 2, we remove active[0]
      queueData.active.splice(0, index - 1);
    } else {
      // Index is in backlog
      const backlogIndex = index - queueData.active.length - 1;
      queueData.active = []; // Clear current active queue
      queueData.active.push(...queueData.backlog.splice(0, backlogIndex + 1));
      // Now the target track is at the end of the new active queue
      // We want to skip TO it, so we remove everything before it
      queueData.active.splice(0, queueData.active.length - 1);
    }

    await PlayerManager.playNext(client, interaction.guildId, player.currentTrack, true, 'command:skipto');
    await interaction.reply({ content: `⏭️ Skipped directly to track **#${index}**!` });
  }
};
