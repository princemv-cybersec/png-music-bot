const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class PlayerManager {
  static async sendController(client, guildId, track, forceNew = false) {
    // 1. Get/Wait for Lock
    const existingLock = this.controllerLocks.get(guildId);
    if (existingLock) await existingLock;

    // 2. Create New Lock
    let resolveLock;
    const newLock = new Promise(res => { resolveLock = res; });
    this.controllerLocks.set(guildId, newLock);

    try {
        await this._processSendController(client, guildId, track, forceNew);
    } finally {
        // 3. Release Lock
        this.controllerLocks.delete(guildId);
        resolveLock();
    }
  }

  static async _processSendController(client, guildId, track, forceNew = false) {
    const queueData = client.queue.get(guildId);
    if (!queueData) return;

    const channelId = client.textChannels.get(guildId);
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const player = client.shoukaku.players.get(guildId);
    if (!player) return;

    const loopMode = client.loop.get(guildId) || 'off';
    const position = player.position || 0;
    const duration = track ? track.info.length : 0;

    const embed = new EmbedBuilder()
      .setAuthor({ name: 'NOW PLAYING', iconURL: client.user.displayAvatarURL() })
      .setTitle(track ? track.info.title : 'Nothing Playing')
      .setURL(track ? track.info.uri : null)
      .setThumbnail(track ? track.info.artworkUrl || null : null)
      .addFields(
        { name: 'Artist', value: track ? track.info.author : 'Unknown', inline: true },
        { name: 'Loop Mode', value: loopMode.charAt(0).toUpperCase() + loopMode.slice(1), inline: true },
        { name: 'Requested By', value: (player.currentTrack && player.currentTrack.requestedBy && player.currentTrack.requestedBy.id) ? `<@${player.currentTrack.requestedBy.id}>` : 'Unknown', inline: true },
        { name: '\u200b', value: `${client.formatTime(position)} ${client.createProgressBar(position, duration)} ${client.formatTime(duration)}`, inline: false }
      )
      .setColor('#1DB954')
      .setFooter({ text: `Volume: ${client.guildSettings.get(guildId)?.volume ?? 100}% • PID: ${process.pid} • Source: ${track ? track.info.sourceName : 'None'}` });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('player_shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('player_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('player_pause').setEmoji(player.paused ? '▶️' : '⏸️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('player_loop').setEmoji('🔁').setStyle(loopMode !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('player_stop').setEmoji('⏺').setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('player_favorite').setEmoji('⭐').setLabel('Favorite').setStyle(ButtonStyle.Secondary)
    );

    const rows = [row1, row2];

    const oldMsgId = client.playerMessages.get(guildId);
    if (!forceNew && oldMsgId) {
      try {
        const msg = await channel.messages.fetch(oldMsgId).catch(() => null);
        if (msg) return await msg.edit({ embeds: [embed], components: rows });
      } catch (e) {}
    }

    if (oldMsgId) {
       await channel.messages.fetch(oldMsgId).then(m => m.delete().catch(() => {})).catch(() => {});
    }

    const newMsg = await channel.send({ embeds: [embed], components: rows }).catch(() => null);
    if (newMsg) client.playerMessages.set(guildId, newMsg.id);
  }

  static startIdleTimer(client, guildId) {
    this.stopIdleTimer(client, guildId);
    const timer = setTimeout(async () => {
      console.log(`[Idle] Disconnecting from guild ${guildId}`);
      await client.shoukaku.leaveVoiceChannel(guildId);
      this.cleanup(client, guildId);
    }, 120000);
    client.idleTimers.set(guildId, timer);
  }

  static stopIdleTimer(client, guildId) {
    const timer = client.idleTimers.get(guildId);
    if (timer) {
      clearTimeout(timer);
      client.idleTimers.delete(guildId);
    }
  }

  static controllerLocks = new Map();
  static transitionLocks = new Map();

  /**
   * Main transition logic when a track ends or is skipped.
   */
  static async playNext(client, guildId, lastTrack = null, isSkip = false, caller = 'unknown') {
    // 1. Get/Wait for Lock
    const existingLock = this.transitionLocks.get(guildId);
    if (existingLock) {
        console.log(`[Player] ${guildId} Transition lock wait (Caller: ${caller})`);
        await existingLock;
    }

    // 2. Create New Lock
    let resolveLock;
    const newLock = new Promise(res => { resolveLock = res; });
    this.transitionLocks.set(guildId, newLock);

    try {
        console.log(`[Player] ${guildId} Transition start (Caller: ${caller})`);
        await this._processPlayNext(client, guildId, lastTrack, isSkip, caller);
    } finally {
        // 3. Release Lock
        this.transitionLocks.delete(guildId);
        resolveLock();
    }
  }

  /**
   * Internal logic for playNext, now protected by the lock.
   */
  static async _processPlayNext(client, guildId, lastTrack = null, isSkip = false, caller = 'unknown') {
    const queueData = client.queue.get(guildId);
    const player = client.shoukaku.players.get(guildId);
    if (!player || !queueData) {
      if (player) player.playingLock = false;
      return;
    }

    // Strict Mutation Lock: Exit if already transitioning
    if (player.playingLock && !isSkip) {
        console.log(`[Player] ${guildId} Transition block: playingLock is true (Caller: ${caller})`);
        return;
    }
    
    player.playingLock = true;
    const loopMode = client.loop.get(guildId) || 'off';
    const now = Date.now();
    const lastPlay = client.lastPlayTime?.get(guildId) || 0;
    
    if (now - lastPlay < 1500) {
        console.log(`[Player] ${guildId} Transition debounce: ${now - lastPlay}ms (Caller: ${caller})`);
        player.playingLock = false;
        return; // Debounce
    } 

    if (!client.lastPlayTime) client.lastPlayTime = new Map();
    client.lastPlayTime.set(guildId, now);

    try {
      if (lastTrack) {
        const modeValue = String(loopMode).trim().toLowerCase();
        if (modeValue === 'track') {
          player.currentTrack = lastTrack;
          await new Promise(r => setTimeout(r, 500)); 
          await player.playTrack({ track: { encoded: lastTrack.encoded } });
          return;
        } else if (modeValue === 'queue') {
          queueData.backlog.push(lastTrack);
        }
      }

      if (queueData.active.length === 0 && queueData.backlog.length > 0) {
        queueData.active = queueData.backlog.slice(0, 10);
        queueData.backlog = queueData.backlog.slice(10);
      }

      if (queueData.active.length === 0) {
        // Autoplay (Radio Mode)
        const settings = client.guildSettings.get(guildId);
        if (settings && settings.autoplay && lastTrack) {
          try {
            const node = client.shoukaku.getIdealNode();
            if (node) {
              const query = `ytsearch:${lastTrack.info.author} ${lastTrack.info.title} official audio similar music`;
              const res = await node.rest.resolve(query);
              if (res && res.data) {
                let tracks = [];
                if (res.loadType === 'search') tracks = res.data;
                else if (res.data.tracks) tracks = res.data.tracks;
                
                if (tracks.length > 0) {
                   // Filter out the same track
                  const nextTrack = tracks.find(t => t.info.uri !== lastTrack.info.uri) || tracks[0];
                  if (nextTrack) {
                    player.currentTrack = {
                      encoded: nextTrack.encoded,
                      info: nextTrack.info,
                      requestedBy: { tag: 'Radio Mode (Autoplay)', id: client.user.id }
                    };
                    await player.playTrack({ track: { encoded: nextTrack.encoded } });
                    return;
                  }
                }
              }
            }
          } catch (e) {
            console.error(`[Player] ${guildId} Autoplay error:`, e);
          }
        }

        player.currentTrack = null;
        player.playingLock = false; // Safety reset
        await this.sendController(client, guildId, null, false);
        this.startIdleTimer(client, guildId);
        return;
      }

      const nextTrack = queueData.active.shift();
      player.currentTrack = nextTrack;
      
      console.log(`[Player] ${guildId} Transitioning to: ${nextTrack.info.title} (Caller: ${caller})`);
      
      // Delay to let node settle
      await new Promise(r => setTimeout(r, 500));
      await player.playTrack({ track: { encoded: nextTrack.encoded } });
    } catch (error) {
      console.error(`[Player] ${guildId} playNext critical error:`, error);
    } finally {
      player.playingLock = false;
    }
  }

  static cleanup(client, guildId) {
    const player = client.shoukaku.players.get(guildId);
    if (player) player.playingLock = false;

    // Read references BEFORE deleting them
    const chId = client.textChannels.get(guildId);
    const msgId = client.playerMessages.get(guildId);

    // Clear controller interval
    const interval = client.controllerIntervals.get(guildId);
    if (interval) {
      clearInterval(interval);
      client.controllerIntervals.delete(guildId);
    }

    // Delete state
    client.queue.delete(guildId);
    client.textChannels.delete(guildId);
    client.loop.delete(guildId);
    client.skipCooldowns.delete(guildId);
    client.lastPlayTime.delete(guildId);

    // Delete old controller message
    if (msgId && chId) {
      client.channels.fetch(chId)
        .then(c => c.messages.fetch(msgId)
          .then(m => m.delete().catch(() => {}))
          .catch(() => {}))
        .catch(() => {});
    }
    client.playerMessages.delete(guildId);

    this.stopIdleTimer(client, guildId);
  }

  static async setFilters(player, type, client) {
    const filters = {};
    
    // Merge Volume from settings
    const settings = client.guildSettings.get(player.guildId);
    if (settings && settings.volume) {
        filters.volume = settings.volume / 100;
    }
    switch (type) {
      case 'bassboost':
        filters.equalizer = [
          { band: 0, gain: 0.6 }, { band: 1, gain: 0.6 }, { band: 2, gain: 0.5 },
          { band: 3, gain: 0.1 }, { band: 4, gain: -0.1 }, { band: 5, gain: -0.1 },
          { band: 6, gain: 0 }, { band: 7, gain: 0.1 }, { band: 8, gain: 0.1 }
        ];
        break;
      case 'nightcore':
        filters.timescale = { speed: 1.25, pitch: 1.25, rate: 1.0 };
        break;
      case 'vaporwave':
        filters.timescale = { speed: 0.85, pitch: 0.8 };
        filters.equalizer = [{ band: 1, gain: 0.3 }, { band: 0, gain: 0.3 }];
        break;
      case '8d':
        filters.rotation = { rotationHz: 0.2 };
        break;
      case 'reset':
      default:
        // empty filters object resets
        break;
    }
    return await player.setFilters(filters);
  }

  /**
   * Centralized logic to join VC, check isPlaying, and queue or play a track.
   * @returns {Promise<{status: 'playing' | 'queued', track: object}>}
   */
  static async queueTrack(client, interaction, track, voiceChannel, requestedAt = Date.now()) {
    const guildId = interaction.guildId;
    
    // 1. Ensure Queue State
    if (!client.queue.has(guildId)) client.queue.set(guildId, { active: [], backlog: [] });
    const queueData = client.queue.get(guildId);
    client.textChannels.set(guildId, interaction.channelId);

    // 2. Get/Join Player
    let player = client.shoukaku.players.get(guildId);
    if (!player) {
        player = await client.shoukaku.joinVoiceChannel({
            guildId: guildId,
            channelId: voiceChannel.id,
            shardId: interaction.guild.shardId,
            deaf: true
        });
        this.setupPlayer(client, player);
    }

    // 3. Prepare Metadata
    const simplifiedTrack = {
        encoded: track.encoded,
        info: {
            title: track.info.title,
            author: track.info.author,
            length: track.info.length,
            uri: track.info.uri,
            sourceName: track.info.sourceName,
            artworkUrl: track.info.artworkUrl
        },
        requestedBy: { tag: interaction.user.tag, id: interaction.user.id },
        requestedAt: requestedAt
    };

    // 4. Decision: Play or Queue
    const playerTrack = player.track; // Shoukaku's internal track state
    // Refined: isPlaying is true if there is a current track OR the player is active
    const isActive = (player.currentTrack && player.track) || player.playingLock;
    const isPlaying = isActive;

    if (!isPlaying) {
        player.playingLock = true;
        try {
            player.currentTrack = simplifiedTrack;
            await player.playTrack({ track: { encoded: track.encoded } });
            return { status: 'playing', track: simplifiedTrack };
        } catch (e) {
            player.playingLock = false;
            player.currentTrack = null;
            throw e;
        }
    } else {
        queueData.active.push(simplifiedTrack);
        // Sort queue by requestedAt to ensure strict order
        queueData.active.sort((a, b) => (a.requestedAt || 0) - (b.requestedAt || 0));
        const pos = queueData.active.findIndex(t => t.requestedAt === requestedAt) + 1;
        return { status: 'queued', track: simplifiedTrack, position: pos };
    }
  }

  static setupPlayer(client, player) {
    if (player.setup) return;
    player.setup = true;
    this.setFilters(player, 'reset', client);

    player.on('start', async (data) => {
      try {
        // Release the playing lock — track has successfully started
        player.playingLock = false;
        this.stopIdleTimer(client, player.guildId);
        await this.sendController(client, player.guildId, data.track, true);
        
        // Track History Settlement Delay (1s)
        // Helps sync player.currentTrack before recording history
        const current = player.currentTrack || { 
            info: data.track.info, 
            encoded: data.track.encoded, 
            requestedBy: { tag: 'Unknown', id: null } 
        };
        
        if (!client.history) client.history = new Map();
        const userId = current.requestedBy?.id;

        if (userId) {
            const history = client.history.get(userId) || [];
            const trackInfo = {
                encoded: current.encoded,
                info: current.info,
                requestedBy: current.requestedBy
            };
                if (history[0]?.info.uri !== trackInfo.info.uri) {
                    history.unshift(trackInfo);
                    if (history.length > 5) history.pop();
                    client.history.set(userId, history);
                }
            }

            // Start progress bar timer
        if (client.controllerIntervals.has(player.guildId)) clearInterval(client.controllerIntervals.get(player.guildId));
        const interval = setInterval(async () => {
          try {
            const p = client.shoukaku.players.get(player.guildId);
            if (!p || p.paused) return;
            await this.sendController(client, player.guildId, data.track, false);
          } catch (e) { console.error(`[Player] ${player.guildId} Controller interval error:`, e); }
        }, 10000);
        client.controllerIntervals.set(player.guildId, interval);
      } catch (e) { console.error(`[Player] ${player.guildId} start event error:`, e); }
    });

    player.on('end', async (data) => {
      try {
        console.log(`[Player] ${player.guildId} end event received. Reason: ${data.reason}`);
        
        // Pre-Transition cleanup
        player.currentTrack = null;
        player.playingLock = false;

        const interval = client.controllerIntervals.get(player.guildId);
        if (interval) {
          clearInterval(interval);
          client.controllerIntervals.delete(player.guildId);
        }

        // Logic Check: Replaced songs should not trigger the next track
        // Note: Shoukaku reasons are lowercase. REPLACED was causing race conditions with manual skips.
        if (data.reason.toLowerCase() === 'replaced') {
          console.log(`[Player] ${player.guildId} reason is replaced, avoiding double-skip.`);
          return;
        }

        // Proceed to next
        await this.playNext(client, player.guildId, null, false, 'event:end');
      } catch (e) { console.error(`[Player] ${player.guildId} end event error:`, e); }
    });

    player.on('exception', async (err) => {
      console.error(`[Failure] ${player.guildId} Lavalink Exception: ${err.message || err.toString()} - Track: ${player.currentTrack?.info.title || 'Unknown'}`);
      
      // Delay before proceeding to skip the broken track
      await new Promise(r => setTimeout(r, 2000));
      await this.playNext(client, player.guildId, null, false, 'event:exception');
    });

    player.on('update', (data) => {
      // Periodic position sync if needed
    });

    // NOTE: Shoukaku error listener is registered once in index.js
    // Do NOT add it here — it would leak a new listener per player
    
    player.on('closed', () => {
      player.currentTrack = null;
      this.cleanup(client, player.guildId);
    });
  }
}

module.exports = PlayerManager;
