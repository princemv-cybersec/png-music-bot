const PlayerManager = require('../playerManager');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const guildId = oldState.guild.id;
    const player = client.shoukaku.players.get(guildId);

    // If the bot itself was in a channel and is now disconnected (newState.channel is null)
    if (oldState.member.id === client.user.id && !newState.channelId) {
      console.log(`[Voice] Bot was disconnected from ${guildId}. Cleaning up player state.`);
      if (player) {
         try {
           await player.destroy();
         } catch (e) {}
      }
      PlayerManager.cleanup(client, guildId);
    }
  },
};
