const { SlashCommandBuilder, EmbedBuilder, version } = require('discord.js');
const os = require('os');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Display bot statistics and performance indicators'),
  async execute(interaction, client) {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor(uptime / 3600) % 24;
    const mins = Math.floor(uptime / 60) % 60;
    const secs = Math.floor(uptime % 60);
    const uptimeStr = days > 0 ? `${days}d ${hours}h ${mins}m ${secs}s` : `${hours}h ${mins}m ${secs}s`;

    const mem = process.memoryUsage();
    const heapUsed = (mem.heapUsed / 1024 / 1024).toFixed(1);
    const heapTotal = (mem.heapTotal / 1024 / 1024).toFixed(1);
    const rss = (mem.rss / 1024 / 1024).toFixed(1);

    // Active players & queue stats
    const activePlayers = client.shoukaku.players.size;
    const totalQueued = Array.from(client.queue.values()).reduce((sum, q) => sum + q.active.length + q.backlog.length, 0);

    // Node stats
    const nodeLines = Array.from(client.shoukaku.nodes.entries()).map(([name, node]) => {
      const status = node.state === 1 ? '🟢' : '🔴';
      const stats = node.stats;
      if (stats) {
        const players = `${stats.playingPlayers}/${stats.players} players`;
        const cpu = stats.cpu ? `${(stats.cpu.lavalinkLoad * 100).toFixed(1)}%` : '?';
        const memUsed = stats.memory ? `${(stats.memory.used / 1024 / 1024).toFixed(0)} MB` : '?';
        const nodeUptime = `${Math.floor(stats.uptime / 3600000)}h ${Math.floor((stats.uptime % 3600000) / 60000)}m`;
        return `${status} **${name}**\n╰ ${players} · CPU: ${cpu} · RAM: ${memUsed} · Up: ${nodeUptime}`;
      }
      return `${status} **${name}** — No stats available`;
    });

    // System info
    const platform = `${os.type()} ${os.arch()}`;
    const cpuModel = os.cpus()[0]?.model?.split('@')[0]?.trim() || 'Unknown';
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);

    const embed = new EmbedBuilder()
      .setTitle('📊 Bot Statistics')
      .setColor('#1DB954')
      .setThumbnail(client.user.displayAvatarURL({ size: 128 }))
      .addFields(
        { 
          name: '🌐 General', 
          value: `**Servers**: ${client.guilds.cache.size}\n**Users**: ${client.guilds.cache.reduce((a, b) => a + b.memberCount, 0).toLocaleString()}\n**Active Players**: ${activePlayers}\n**Queued Tracks**: ${totalQueued}`, 
          inline: true 
        },
        { 
          name: '⚙️ Performance', 
          value: `**Uptime**: ${uptimeStr}\n**Heap**: ${heapUsed}/${heapTotal} MB\n**RSS**: ${rss} MB\n**Platform**: ${platform}`, 
          inline: true 
        },
        { 
          name: '💾 Versions', 
          value: `**Discord.js**: v${version}\n**Node.js**: ${process.version}\n**Shoukaku**: v4.3.0\n**CPU**: ${cpuModel}`, 
          inline: true 
        },
        { 
          name: `🛰️ Lavalink Nodes (${client.shoukaku.nodes.size})`, 
          value: nodeLines.join('\n') || 'No nodes connected', 
          inline: false 
        }
      )
      .setFooter({ text: `PID: ${process.pid} • System RAM: ${totalMem} GB` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

