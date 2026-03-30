const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latencies'),
  async execute(interaction, client) {
    const start = Date.now();
    await interaction.deferReply();
    const roundtrip = Date.now() - start;

    const nodeLines = Array.from(client.shoukaku.nodes.entries()).map(([name, node]) => {
      const status = node.state === 1 ? '🟢' : '🔴';
      const stats = node.stats;
      const players = stats?.playingPlayers ?? '?';
      const uptime = stats?.uptime ? `${Math.floor(stats.uptime / 3600000)}h` : '?';
      return `${status} **${name}** — ${players} playing · up ${uptime}`;
    });

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor('#1DB954')
      .addFields(
        { name: 'Bot Latency', value: `**Gateway**: ${client.ws.ping}ms\n**Roundtrip**: ${roundtrip}ms`, inline: true },
        { name: `Lavalink Nodes (${nodeLines.length})`, value: nodeLines.join('\n') || 'None connected', inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
