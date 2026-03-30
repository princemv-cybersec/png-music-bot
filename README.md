# PNG Music Bot (Public Node Version) 🚀

A high-performance Discord music bot built with **Node.js**, **Discord.js v14**, and **Shoukaku**. This version runs purely on **Public Lavalink Nodes**, meaning no local Java or `Lavalink.jar` is required.

## 🏗️ Features

- **Zero Resource Usage:** Use external public nodes for audio processing.
- **Failover System:** Automatically switches between multiple public nodes if one goes offline.
- **Dynamic Controller:** Interactive embed with progress bars and buttons.
- **Custom Queue:** Advanced `active` and `backlog` management for large playlists.
- **Dual Commands:** Supports both `/` Slash Commands and `!` Prefix Commands.

## 🛠️ Setup

1. **Install Dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to a new file named `.env`.
   - Edit the `.env` file with your `DISCORD_TOKEN` and any additional public nodes you want to use.

3. **Start the bot:**
   Using Node:
   ```bash
   node index.js
   ```
   Using PM2:
   ```bash
   pm2 start ecosystem.config.js
   ```

## 🌐 Public Lavalink Nodes

These nodes are included in `config.js` as defaults:

| Name      | Host                       | Port | Password                        | Secure |
| --------- | -------------------------- | ---- | ------------------------------- | ------ |
| Serenetia | `lavalinkv4.serenetia.com` | 443  | `https://dsc.gg/ajidevserver`   | Yes    |
| AjieBlogs | `lava-v4.ajieblogs.eu.org` | 443  | `https://dsc.gg/ajidevserver`   | Yes    |
| MilloHost | `lava-v4.millohost.my.id`  | 443  | `https://discord.gg/mjS5J2K3ep` | Yes    |

> [!TIP]
> The bot automatically fails over to the next available node if one goes offline or is rate-limited.

## 📜 Commands

- `/play [query]` or `!play [query]` - Play music.
- `/help` or `!help` - Show all available commands.
- `/skip` or `!skip` - Skip to the next track.
- `/stop` or `!stop` - Stop playback and leave VC.
- `/pause` / `/resume` - Control playback.
- `/queue` - Show current queue.
- `/nowplaying` - Show current song info.
- `/loop [mode]` - Set loop mode (off, track, queue).
- `/volume [level]` - Change volume (0-150).
- `/shuffle` - Shuffle tracks.
- `/clearqueue` - Clear all tracks.
- `/ping` - Check latency.
