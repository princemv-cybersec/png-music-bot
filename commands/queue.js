const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show current queue'),
  async execute(interaction, client) {
    const queueData = client.queue.get(interaction.guildId);
    const player = client.shoukaku.players.get(interaction.guildId);

    if (!queueData || (!player?.currentTrack && queueData.active.length === 0)) {
       return interaction.reply({ content: 'Queue is empty!', flags: 64 });
    }

    const nowPlaying = player?.currentTrack;
    const npText = nowPlaying
      ? `**${nowPlaying.info.title}** \`[${client.formatTime(nowPlaying.info.length)}]\`\n*Requested by ${nowPlaying.requestedBy?.tag || 'Unknown'}*`
      : 'None';

    const active = queueData.active.slice(0, 10).map((t, i) => 
      `${i + 1}. **${t.info.title}** \`[${client.formatTime(t.info.length)}]\`\n   *Requested by ${t.requestedBy?.tag || 'Unknown'}*`
    ).join('\n') || 'None';

    const totalTracks = queueData.active.length + queueData.backlog.length;
    const totalMs = [...queueData.active, ...queueData.backlog].reduce((sum, t) => sum + (t.info.length || 0), 0);
    
    const embed = new EmbedBuilder()
      .setTitle('📋 Current Queue')
      .setDescription(`**Now Playing:**\n${npText}\n\n**Next Up:**\n${active}`)
      .setFooter({ text: `${totalTracks} tracks in queue • Total duration: ${client.formatTime(totalMs)} • Backlog: ${queueData.backlog.length}` })
      .setColor('#1DB954');

    await interaction.reply({ embeds: [embed] });
  }
};

