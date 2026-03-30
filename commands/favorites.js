const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('favorites')
    .setDescription('List or play your favorite tracks'),
  async execute(interaction, client) {
    const favoritesPath = path.join(__dirname, '../favorites.json');
    let favorites = {};

    try {
      if (fs.existsSync(favoritesPath)) {
        favorites = JSON.parse(fs.readFileSync(favoritesPath, 'utf8'));
      }
    } catch (e) {
      console.error('[Favorites] Error loading favorites.json:', e);
    }

    const userId = interaction.user.id;
    const userFavorites = favorites[userId] || [];

    if (userFavorites.length === 0) {
      return interaction.reply({ content: 'You have no favorite tracks saved yet. Use `/favorite` while playing a song!', flags: 64 });
    }

    // Paginate or just show list
    const list = userFavorites.slice(0, 10).map((t, i) => `${i + 1}. **${t.info.title}**`).join('\n') || 'None';

    const embed = new EmbedBuilder()
      .setTitle(`⭐ Your Favorites (Top 10 of ${userFavorites.length})`)
      .setDescription(list)
      .setColor('#FFD700')
      .setFooter({ text: 'Use /play with a song title to find it again!' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('fav_play_all')
        .setLabel('Play All')
        .setStyle(ButtonStyle.Success)
        .setEmoji('▶️')
    );

    // Add Remove Select Menu if there are favorites
    const rows = [row];
    if (userFavorites.length > 0) {
      const select = new StringSelectMenuBuilder()
        .setCustomId('fav_remove')
        .setPlaceholder('Select a song to remove')
        .addOptions(userFavorites.slice(0, 25).map((t, i) => ({
          label: t.info.title.substring(0, 100),
          value: i.toString()
        })));
      rows.push(new ActionRowBuilder().addComponents(select));
    }

    await interaction.reply({ embeds: [embed], components: rows });

    // Handle button interaction
    const filter = i => (i.customId === 'fav_play_all' || i.customId === 'fav_remove') && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async i => {
      await i.deferUpdate().catch(() => {});
      if (i.customId === 'fav_play_all') {
         // Check voice channel
         const voiceChannel = interaction.member.voice.channel;
         if (!voiceChannel) return i.followUp({ content: 'Join a voice channel first to play your favorites!', flags: 64 });

         let player = client.shoukaku.players.get(interaction.guildId);
         if (!player) {
            try {
                player = await client.shoukaku.joinVoiceChannel({
                    guildId: interaction.guild.id,
                    channelId: voiceChannel.id,
                    shardId: interaction.guild.shardId
                });
                const PlayerManager = require('../playerManager');
                PlayerManager.setupPlayer(client, player);
            } catch (e) {
                return i.followUp({ content: 'Failed to join voice channel.', flags: 64 });
            }
         }

         // Ensure queue and text channel exist
         if (!client.queue.has(interaction.guildId)) {
            client.queue.set(interaction.guildId, { active: [], backlog: [] });
         }
         client.textChannels.set(interaction.guildId, interaction.channelId);
         
         const queueData = client.queue.get(interaction.guildId);
         const PlayerManager = require('../playerManager');

         const tracksToQueue = userFavorites.map(t => ({
             ...t,
             requestedBy: { tag: interaction.user.tag, id: interaction.user.id }
         }));

         const wasEmpty = queueData.active.length === 0 && !player.currentTrack;
         queueData.backlog.push(...tracksToQueue);
         
         if (wasEmpty) {
            await PlayerManager.playNext(client, interaction.guildId, null, false, 'command:favorites');
         }

         await i.editReply({ content: `✅ Added **${tracksToQueue.length}** favorites to the queue!`, components: [] });
      } else if (i.customId === 'fav_remove') {
         const index = parseInt(i.values[0]);
         const removed = userFavorites.splice(index, 1)[0];
         
         // Save back
         favorites[userId] = userFavorites;
         await fs.promises.writeFile(favoritesPath, JSON.stringify(favorites, null, 2));

         await i.editReply({ content: `🗑️ Removed **${removed.info.title}** from your favorites!`, embeds: [], components: [] });
      }
    });
  }
};
