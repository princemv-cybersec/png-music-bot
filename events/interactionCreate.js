const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');
const PlayerManager = require('../playerManager');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction, client);
      } catch (error) {
        if (error.code === 10062 || error.code === 40060) return;
        console.error(`Slash command error: ${interaction.commandName}`, error);
        
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: 'There was an error while executing this command!', flags: 64 });
          } else {
            await interaction.reply({ content: 'There was an error while executing this command!', flags: 64 });
          }
        } catch (e) {}
      }
    } else if (interaction.isButton()) {
      const player = client.shoukaku.players.get(interaction.guildId);
      if (!player) return;

      // Acknowledge immediately
      await interaction.deferUpdate().catch(() => {});

      switch (interaction.customId) {
        case 'player_pause':
          await player.setPaused(!player.paused);
          break;

        case 'player_skip':
          await PlayerManager.playNext(client, interaction.guildId, player.currentTrack, true, 'button:skip');
          break;

        case 'player_loop': {
          const currentMode = client.loop.get(interaction.guildId) || 'off';
          const modes = ['off', 'track', 'queue'];
          const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
          client.loop.set(interaction.guildId, nextMode);
          break;
        }

        case 'player_shuffle': {
          const queue = client.queue.get(interaction.guildId);
          if (queue) {
            const allTracks = [...queue.active, ...queue.backlog];
            for (let i = allTracks.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [allTracks[i], allTracks[j]] = [allTracks[j], allTracks[i]];
            }
            queue.active = allTracks.slice(0, 10);
            queue.backlog = allTracks.slice(10);
          }
          break;
        }

        case 'player_stop':
          PlayerManager.cleanup(client, interaction.guildId);
          await client.shoukaku.leaveVoiceChannel(interaction.guildId).catch(() => {});
          return; // No controller update needed after stop

        case 'player_favorite': {
          const track = player.currentTrack;
          if (!track) return interaction.followUp({ content: 'No track playing.', flags: 64 }).catch(() => {});

          const favoritesPath = path.join(__dirname, '../favorites.json');
          let favorites = {};
          try {
            if (fs.existsSync(favoritesPath)) favorites = JSON.parse(fs.readFileSync(favoritesPath, 'utf8'));
          } catch (e) {}

          if (!favorites[interaction.user.id]) favorites[interaction.user.id] = [];

          const isFavorited = favorites[interaction.user.id].some(t => t.info.uri === track.info.uri);

          if (isFavorited) {
            favorites[interaction.user.id] = favorites[interaction.user.id].filter(t => t.info.uri !== track.info.uri);
            await interaction.followUp({ content: `🗑️ Removed **${track.info.title}** from your favorites.`, flags: 64 }).catch(() => {});
          } else {
            favorites[interaction.user.id].push({ encoded: track.encoded, info: track.info });
            await interaction.followUp({ content: `⭐ Added **${track.info.title}** to your favorites!`, flags: 64 }).catch(() => {});
          }
          await fs.promises.writeFile(favoritesPath, JSON.stringify(favorites, null, 2));
          break;
        }
      }

      // Update controller UI after every button action
      await PlayerManager.sendController(client, interaction.guildId, player.currentTrack, false);
    }
  }
};
