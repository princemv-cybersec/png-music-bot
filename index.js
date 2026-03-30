require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Shoukaku, Connectors } = require('shoukaku');
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');
const PlayerManager = require('./playerManager');

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Shoukaku Manager Setup
const nodes = config.nodes.map(n => ({
  name: n.name,
  url: n.url,
  auth: n.auth,
  secure: n.secure
}));

client.shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes, {
  resume: true,
  reconnectTries: 10,
  reconnectInterval: 5000,
  restTimeout: 10000
});

// State Management
client.commands = new Collection();
client.players = new Map();
client.lastPlayTime = new Map();
client.guildSettings = new Map();

// Load Guild Settings
const settingsPath = path.join(__dirname, 'guildSettings.json');
try {
  if (fs.existsSync(settingsPath)) {
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    for (const [id, s] of Object.entries(data)) client.guildSettings.set(id, s);
  }
} catch (e) { console.log('[Settings] Error loading:', e.message); }

client.saveSettings = async () => {
  try {
    const data = Object.fromEntries(client.guildSettings);
    await fs.promises.writeFile(settingsPath, JSON.stringify(data, null, 2));
  } catch (e) { console.log('[Settings] Error saving:', e.message); }
};
client.queue = new Map(); // { active: [], backlog: [] }
client.textChannels = new Map();
client.loop = new Map(); // 'off', 'track', 'queue'
client.playerMessages = new Map(); // message ID for controller
client.controllerLocks = new Map(); 
client.controllerIntervals = new Map(); 
client.idleTimers = new Map();
client.history = new Map();
client.skipCooldowns = new Map();
client.joinLocks = new Set();

// Helper: Format Time
client.formatTime = (ms) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Helper: Create Progress Bar
client.createProgressBar = (current, total, size = 15) => {
  if (!total || total <= 0 || isNaN(total) || !isFinite(total)) return '🟢' + '▬'.repeat(size);
  const safeCurrent = (isNaN(current) || !isFinite(current) || current < 0) ? 0 : current;
  
  let progress = Math.floor((size * safeCurrent) / total);
  if (isNaN(progress) || !isFinite(progress)) progress = 0;
  progress = Math.min(size, Math.max(0, progress));
  
  const empty = size - progress;
  return `${'▬'.repeat(progress)}🟢${'▬'.repeat(empty)}`;
};

// Shoukaku Logger
client.shoukaku.on('ready', async (name) => {
  console.log(`[Shoukaku] Node "${name}" connected.`);
  
  // Restore currentTrack for any existing players (Shoukaku resume)
  for (const player of client.shoukaku.players.values()) {
    if (!player.setup) {
      PlayerManager.setupPlayer(client, player);
      // Apply saved volume
      const settings = client.guildSettings.get(player.guildId);
      if (settings && settings.volume) {
        player.setFilterVolume(settings.volume / 100);
      }
    }
  }
  
});
client.shoukaku.on('error', (name, error) => {
  if (error.message?.includes('429')) {
    console.error(`[Shoukaku] Node "${name}" RATE LIMITED (429). Consider switching nodes.`);
  } else if (error.message?.includes('403')) {
    console.error(`[Shoukaku] Node "${name}" Access Forbidden (403). Check auth credentials.`);
  } else {
    console.error(`[Shoukaku] Node "${name}" error: ${error.message}`);
  }
});
client.shoukaku.on('disconnect', (name, count) => console.log(`[Shoukaku] Node "${name}" disconnected. Players: ${count}`));

// Load Commands
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Load Events
const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  const listener = (...args) => event.execute(...args, client);
  
  if (event.name === 'clientReady') {
    client.once('clientReady', listener);
  } else if (event.once) {
    client.once(event.name, listener);
  } else {
    client.on(event.name, listener);
  }
}

// Global Prefix Command Handler
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(config.prefix) || message.author.bot) return;

  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.commands.get(commandName);

  if (!command) return;

  // Mock interaction for compatibility
  const interaction = {
    guildId: message.guild.id,
    guild: message.guild,
    channelId: message.channelId,
    channel: message.channel,
    member: message.member,
    user: message.author,
    options: {
      getString: (name) => {
        if (name === 'query') return args.join(' ');
        if (name === 'mode') return args[0];
        if (name === 'type') return args[0];
        return null;
      },
      getInteger: () => parseInt(args[0]),
    },
    replied: false,
    deferred: false,
    async reply(p) { 
      this.replied = true;
      return message.reply(p); 
    },
    async editReply(p) {
      this.replied = true;
      return message.reply(p);
    },
    async deferReply() { this.deferred = true; },
    async followUp(p) {
      this.replied = true;
      return message.reply(p);
    },
    async deferUpdate() { this.deferred = true; },
    async deleteReply() {}
  };

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`Prefix command error: ${commandName}`, error);
  }
});

client.on('error', console.error);

client.login(config.token);

// Graceful Shutdown — cleanly leave all voice channels
const gracefulShutdown = async (signal) => {
  console.log(`[Shutdown] Received ${signal}. Disconnecting from all voice channels...`);
  for (const [guildId] of client.shoukaku.players) {
    try {
      PlayerManager.cleanup(client, guildId);
      await client.shoukaku.leaveVoiceChannel(guildId);
    } catch (e) {}
  }
  console.log('[Shutdown] Cleanup complete. Exiting.');
  process.exit(0);
};
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Anti-Crash] Unhandled Rejection:', reason);
  if (reason && reason.stack) console.error(reason.stack);
});

process.on('uncaughtException', (err, origin) => {
  console.error('[Anti-Crash] Uncaught Exception:', err, origin);
  if (err && err.stack) console.error(err.stack);
});

// Prevent process from exiting if event loop is empty
process.stdin.resume();

process.on('exit', (code) => {
  console.log(`[Process] Bot is exiting with code: ${code}`);
});
