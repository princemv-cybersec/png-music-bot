![PNG Music Bot Banner](assets/banner.png)

# PNG Music Bot (Public Node Version) 🚀

A high-performance Discord music bot built with **Node.js**, **Discord.js v14**, and **Shoukaku**. This version runs purely on **Public Lavalink Nodes**, meaning no local Java or `Lavalink.jar` is required for audio processing.

---

## 🏗️ Features

- **Zero Local Resource Usage:** Audio processing is handled by external public Lavalink nodes.
- **Failover System:** Automatically switches between multiple public nodes if one goes offline or is rate-limited.
- **Interactive Controller:** Real-time progress bars, skip/pause/loop buttons, and dynamic status updates.
- **Advanced Queueing:** Manage `active` and `backlog` tracks with ease—supports massive playlists.
- **Slash & Prefix Commands:** Full support for `/` slash commands (auto-registered) and traditional `!` prefix commands.
- **Persistence:** Remembers volume settings and loop modes across sessions.

---

## 🛠️ Setup Guide

### 1. Discord Developer Portal
1. Create a new application at [Discord Developer Portal](https://discord.com/developers/applications).
2. Navigate to the **Bot** tab and click **Add Bot**.
3. **IMPORTANT**: Enable the following **Privileged Gateway Intents**:
   - `Presence Intent` (Optional)
   - `Server Members Intent` (Optional)
   - `Message Content Intent` (REQUIRED for prefix commands)
4. Copy your **Bot Token**.

### 2. Installation
1. Ensure you have **Node.js 18.0.0** or higher installed.
2. Clone the repository:
   ```bash
   git clone https://github.com/princemv-cybersec/Png-Music.git
   cd Png-Music
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### 3. Configuration
1. Copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and paste your `DISCORD_TOKEN`.

### 4. Start the Bot
- **Using Node:**
  ```bash
  npm start
  ```
- **Using PM2 (Recommended for 24/7):**
  ```bash
  pm2 start ecosystem.config.js
  ```
- **Using Docker:**
  ```bash
  docker build -t png-music-bot .
  docker run -d --name png-music-bot --env-file .env png-music-bot
  ```

---

## 🌐 Public Lavalink Nodes

The bot includes several default high-quality public nodes in `config.js`. You can add more in your `.env` file using the `LAVALINK_NODES` variable.

| Service   | Host                       | Port | Secure |
| --------- | -------------------------- | ---- | ------ |
| Serenetia | `lavalinkv4.serenetia.com` | 443  | Yes    |
| AjieBlogs | `lava-v4.ajieblogs.eu.org` | 443  | Yes    |
| MilloHost | `lava-v4.millohost.my.id`  | 443  | Yes    |

---

## 📜 Commands

| Slash Command | Prefix Command | Description |
| ------------- | -------------- | ----------- |
| `/play [query]` | `!play [query]` | Plays a song/playlist from YouTube/Spotify/SoundCloud. |
| `/skip` | `!skip` | Skips the current track. |
| `/stop` | `!stop` | Stops playback and leaves the voice channel. |
| `/pause` | `!pause` | Pauses playback. |
| `/resume` | `!resume` | Resumes playback. |
| `/queue` | `!queue` | Lists the current tracks in the queue. |
| `/nowplaying` | `!np` | Shows detailed info about the current song. |
| `/loop [mode]`| `!loop [mode]` | Set loop to `off`, `track`, or `queue`. |
| `/volume` | `!vol [0-150]` | Changes the player volume. |
| `/shuffle` | `!shuffle` | Shuffles the current queue. |
| `/clearqueue` | `!clear` | Clears all tracks from the queue. |
| `/ping` | `!ping` | Check the bot's latency. |

---

## ❓ Troubleshooting

- **"No players found"**: Ensure the bot is in a voice channel.
- **"Node disconnected"**: The public node might be down; the bot will automatically try the next one in the list.
- **Command not registering**: If slash commands don't appear, restart the bot; it registers them globally on every startup.
- **429 Errors**: The public node is being rate-limited by the platform (e.g., YouTube). Shoukaku will attempt to migrate to a different node.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
**Made with ❤️ by PrinceMV**
