/**
 * Shared validation utilities for commands.
 * Reduces code duplication across all command files.
 */

const { MessageFlags } = require('discord.js');

module.exports = {
  /**
   * Check if a Shoukaku player exists for this guild.
   * @returns {string|null} Error message or null if valid.
   */
  requirePlayer(interaction, client) {
    const player = client.shoukaku.players.get(interaction.guildId);
    if (!player) return 'Nothing is currently playing.';
    return null;
  },

  /**
   * Check if the user is in a voice channel.
   * @returns {string|null} Error message or null if valid.
   */
  requireVoiceChannel(interaction) {
    if (!interaction.member.voice?.channel) return 'Join a voice channel first!';
    return null;
  },

  /**
   * Check if the user is in the same VC as the bot.
   * @returns {string|null} Error message or null if valid.
   */
  requireSameVC(interaction, client) {
    const userVC = interaction.member.voice?.channelId;
    const botConnection = client.shoukaku.connections.get(interaction.guildId);
    const botVC = botConnection?.channelId;

    if (!userVC) return 'You must be in a voice channel!';
    if (botVC && userVC !== botVC) return 'You must be in the same voice channel as the bot!';
    return null;
  },

  /**
   * Check if the bot has Connect + Speak permissions in the target VC.
   * @returns {string|null} Error message or null if valid.
   */
  requireVCPermissions(voiceChannel, client) {
    const permissions = voiceChannel.permissionsFor(client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return '❌ I need **Connect** and **Speak** permissions in your voice channel!';
    }
    return null;
  },

  /**
   * Safe reply that handles already-replied/deferred interactions.
   * Uses flags instead of deprecated ephemeral option.
   */
  async safeReply(interaction, content, ephemeral = false) {
    const payload = typeof content === 'string' ? { content } : { ...content };
    if (ephemeral) payload.flags = MessageFlags.Ephemeral;
    try {
      if (interaction.replied || interaction.deferred) {
        return await interaction.followUp(payload);
      } else {
        return await interaction.reply(payload);
      }
    } catch (e) {
      if (e.code !== 10062 && e.code !== 40060) {
        console.error('[SafeReply] Error:', e.message);
      }
    }
  }
};
