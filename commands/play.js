const { SlashCommandBuilder } = require('discord.js');
const PlayerManager = require('../playerManager');
const { requireVCPermissions } = require('../utils/checks');

/**
 * Attempt to join a voice channel with timeout protection.
 * Extracted so it can be called for retry on auto-recovery.
 */
async function _attemptJoin(client, interaction, voiceChannel) {
  const joinPromise = client.shoukaku.joinVoiceChannel({
    guildId: interaction.guild.id,
    channelId: voiceChannel.id,
    shardId: interaction.guild.shardId,
    deaf: true
  });

  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Connection timed out')), 20000)
  );

  const player = await Promise.race([joinPromise, timeoutPromise]);
  if (!player.setup) PlayerManager.setupPlayer(client, player);
  return player;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube/Spotify')
    .addStringOption(option => 
      option.setName('query')
        .setDescription('Song name or URL')
        .setRequired(true)),
  async execute(interaction, client) {
    const query = interaction.options.getString('query');
    const requestedAt = Date.now();
    // Set text channel for controller
    client.textChannels.set(interaction.guildId, interaction.channelId);

    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) return interaction.reply({ content: 'Join a voice channel first!', flags: 64 });

    // Check bot permissions in the voice channel
    const permErr = requireVCPermissions(voiceChannel, client);
    if (permErr) return interaction.reply({ content: permErr, flags: 64 });


    try {
      await interaction.deferReply();
    } catch (e) {
      if (e.code === 10062 || e.code === 40060) return;
      throw e;
    }

    if (!client.joinLocks) client.joinLocks = new Set();
    if (client.joinLocks.has(interaction.guild.id)) return;

    const node = client.shoukaku.getIdealNode();
    if (!node) return interaction.editReply('No Lavalink nodes available.');

    let player = client.shoukaku.players.get(interaction.guild.id);
    const existingConn = client.shoukaku.connections.get(interaction.guild.id);
    const currentChannel = existingConn?.channelId;

    // Health check: if we have a player but the connection state looks dead, nuke it
    if (player && existingConn) {
        const connState = existingConn.state;
        // Shoukaku connection states: 0=CONNECTING, 1=NEARLY, 2=CONNECTED, 3=RECONNECTING, 4=DISCONNECTING, 5=DISCONNECTED
        if (connState >= 4 || (!existingConn.sessionId && !existingConn.serverUpdate)) {
            console.log(`[Player] ${interaction.guild.id} Stale connection detected (state=${connState}). Cleaning up.`);
            PlayerManager.cleanup(client, interaction.guild.id);
            await client.shoukaku.leaveVoiceChannel(interaction.guild.id).catch(() => null);
            player = null;
        }
    }

    if (player && currentChannel !== voiceChannel.id) {
        console.log(`[Player] ${interaction.guild.id} Moving player to ${voiceChannel.id}`);
        await client.shoukaku.leaveVoiceChannel(interaction.guild.id).catch(() => null);
        player = null; // Forces a fresh join in the new channel
    }

    if (!player) {
        try {
          client.joinLocks.add(interaction.guild.id);
          player = await _attemptJoin(client, interaction, voiceChannel);
          
        } catch (error) {
          console.error(`[Player] ${interaction.guild.id} Join error:`, error);
          
          // Check for existing connection errors first
          if (error.message.includes('existing connection') || error.message.includes('already have')) {
             player = client.shoukaku.players.get(interaction.guild.id);
             if (player && !player.setup) PlayerManager.setupPlayer(client, player);
          } 
          // Auto-recovery: if it was a timeout, nuke stale state and retry ONCE
          else if (error.message.includes('not established') || error.message.includes('timed out') || error.message.includes('15 seconds')) {
            console.log(`[Player] ${interaction.guild.id} Connection timeout — attempting auto-recovery...`);
            
            // Force-clean the stale connection
            PlayerManager.cleanup(client, interaction.guild.id);
            await client.shoukaku.leaveVoiceChannel(interaction.guild.id).catch(() => null);
            
            // Small delay to let Discord gateway settle
            await new Promise(r => setTimeout(r, 2000));
            
            try {
              player = await _attemptJoin(client, interaction, voiceChannel);
              console.log(`[Player] ${interaction.guild.id} Auto-recovery succeeded!`);
            } catch (retryError) {
              console.error(`[Player] ${interaction.guild.id} Auto-recovery failed:`, retryError);
              return interaction.editReply('Failed to join voice channel after retry. The voice server may be temporarily unavailable.');
            }
          } else {
            return interaction.editReply('Failed to join voice channel (Timeout/Error). Check node status!');
          }
        } finally {
          client.joinLocks.delete(interaction.guild.id);
        }
    }

    const res = await node.rest.resolve(query.startsWith('http') ? query : `ytsearch:${query}`);
    if (!res || !res.data || (res.loadType === 'empty') || (res.loadType === 'error')) {
      return interaction.editReply('No results found.');
    }

    if (res.loadType === 'playlist') {
      const tracks = res.data.tracks;
      const first = tracks.shift();
      const result = await PlayerManager.queueTrack(client, interaction, first, voiceChannel, requestedAt);
      
      const rest = tracks.map(t => ({
        encoded: t.encoded,
        info: {
            title: t.info.title,
            author: t.info.author,
            length: t.info.length,
            uri: t.info.uri,
            sourceName: t.info.sourceName,
            artworkUrl: t.info.artworkUrl
        },
        requestedBy: { tag: interaction.user.tag, id: interaction.user.id },
        requestedAt: requestedAt
      }));

      const queueData = client.queue.get(interaction.guildId);
      queueData.backlog = queueData.backlog.concat(rest);
      
      await interaction.editReply(`✅ ${result.status === 'playing' ? 'Started playing' : 'Queued'} first track of **${res.data.info.name}** + added **${rest.length}** tracks to backlog.`);
    } else {
      const track = res.loadType === 'search' ? res.data[0] : res.data;
      const result = await PlayerManager.queueTrack(client, interaction, track, voiceChannel, requestedAt);
      
      if (result.status === 'playing') {
        await interaction.editReply(`✅ Started playing: **${result.track.info.title}**`);
      } else {
        await interaction.editReply(`✅ Queued: **${result.track.info.title}** (Position: #${result.position})`);
      }
    }
  }
};
