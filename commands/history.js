const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const PlayerManager = require('../playerManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('See the last 5 songs played in this guild'),
  async execute(interaction, client) {
    const history = client.history?.get(interaction.user.id) || [];

    if (history.length === 0) {
      return interaction.reply({ content: 'You have no songs in your personal history yet.', flags: 64 });
    }

    const embed = new EmbedBuilder()
      .setTitle('⏳ Your Personal History')
      .setDescription('Select a song from your history below to play it again.')
      .setColor('#1DB954');

    const list = history.map((h, i) => `${i + 1}. **${h.info.title}**\n*by ${h.info.author}*`).join('\n\n');
    embed.addFields({ name: 'Last 5 Tracks', value: list });

    const options = history.map((track, i) => ({
      label: `${i + 1}. ${track.info.title.substring(0, 90)}`,
      description: `${track.info.author.substring(0, 90)}`,
      value: `history_${i}`
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId('history_select')
      .setPlaceholder('Re-play a song...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    const response = await interaction.reply({ embeds: [embed], components: [row], flags: 64 });

    const collector = response.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 60000
    });

    collector.on('collect', async i => {
      if (!i || !i.isStringSelectMenu()) return;
      if (!i.values || i.values.length === 0) return;

      const index = parseInt(i.values[0].replace('history_', ''));
      const trackTemplate = history[index];
      
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) return i.reply({ content: 'Join a voice channel first!', flags: 64 });

      await i.deferUpdate();
      
      const result = await PlayerManager.queueTrack(client, interaction, trackTemplate, voiceChannel, Date.now());
      
      if (result.status === 'playing') {
        await interaction.editReply({ content: `✅ Playing again: **${result.track.info.title}**`, embeds: [], components: [] });
      } else {
        await interaction.editReply({ content: `✅ Queued from history: **${result.track.info.title}** (Position: #${result.position})`, embeds: [], components: [] });
      }
      collector.stop();
    });
  },
};
