const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('favorite')
    .setDescription('Add/Remove the current track to your favorites list'),
  async execute(interaction, client) {
    const player = client.shoukaku.players.get(interaction.guildId);
    if (!player || !player.currentTrack) {
      return interaction.reply({ content: 'Nothing is currently playing.', flags: 64 });
    }

    const track = player.currentTrack;
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
    if (!favorites[userId]) favorites[userId] = [];

    const existingIndex = favorites[userId].findIndex(t => t.info.uri === track.info.uri);

    if (existingIndex > -1) {
      favorites[userId].splice(existingIndex, 1);
      await fs.promises.writeFile(favoritesPath, JSON.stringify(favorites, null, 2));
      return interaction.reply({ content: `⭐ Removed **${track.info.title}** from your favorites.` });
    } else {
      // Limit to 50 favorites
      if (favorites[userId].length >= 50) {
        return interaction.reply({ content: 'You have reached the limit of 50 favorites!', flags: 64 });
      }

      favorites[userId].push({
        encoded: track.encoded,
        info: track.info
      });
      await fs.promises.writeFile(favoritesPath, JSON.stringify(favorites, null, 2));
      return interaction.reply({ content: `⭐ Added **${track.info.title}** to your favorites!` });
    }
  }
};
