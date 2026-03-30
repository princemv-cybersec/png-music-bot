const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a song from the queue')
    .addIntegerOption(option => 
      option.setName('index')
        .setDescription('The index of the song to remove (see /queue)')
        .setRequired(true)),
  async execute(interaction, client) {
    const index = interaction.options.getInteger('index');
    const queueData = client.queue.get(interaction.guildId);

    if (!queueData || (queueData.active.length === 0 && queueData.backlog.length === 0)) {
       return interaction.reply({ content: 'The queue is currently empty.', flags: 64 });
    }

    // Index 1 is the next song (active[0])
    if (index < 1 || index > (queueData.active.length + queueData.backlog.length)) {
       return interaction.reply({ content: 'Invalid index. Check the queue for valid numbers.', flags: 64 });
    }

    let removedTrack;
    if (index <= queueData.active.length) {
      removedTrack = queueData.active.splice(index - 1, 1)[0];
    } else {
      const backlogIndex = index - queueData.active.length - 1;
      removedTrack = queueData.backlog.splice(backlogIndex, 1)[0];
    }

    await interaction.reply({ content: `🗑️ Removed: **${removedTrack.info.title}** from the queue.` });
  }
};
