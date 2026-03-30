const { SlashCommandBuilder } = require('discord.js');
const PlayerManager = require('../playerManager');
const { requireVCPermissions } = require('../utils/checks');

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

    if (player && currentChannel !== voiceChannel.id) {
        console.log(`[Player] ${interaction.guild.id} Moving player to ${voiceChannel.id}`);
        await client.shoukaku.leaveVoiceChannel(interaction.guild.id).catch(() => null);
        player = null; // Forces a fresh join in the new channel
    }

    if (!player) {
        try {
          client.joinLocks.add(interaction.guild.id);
          
          // Join with timeout protection
          const joinPromise = client.shoukaku.joinVoiceChannel({
            guildId: interaction.guild.id,
            channelId: voiceChannel.id,
            shardId: interaction.guild.shardId,
            deaf: true
          });

          // 20-second timeout for join
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timed out')), 20000)
          );

          player = await Promise.race([joinPromise, timeoutPromise]);
          if (!player.setup) PlayerManager.setupPlayer(client, player);
          
        } catch (error) {
          console.error(`[Player] ${interaction.guild.id} Join error:`, error);
          if (error.message.includes('existing connection') || error.message.includes('already have')) {
             player = client.shoukaku.players.get(interaction.guild.id);
             if (player && !player.setup) PlayerManager.setupPlayer(client, player);
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
