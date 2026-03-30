require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  prefix: '!',
  nodes: process.env.LAVALINK_NODES ? process.env.LAVALINK_NODES.split(',').map(n => {
    const [name, host, port, auth, secure] = n.split('|');
    return { name, url: `${host}:${port}`, auth, secure: secure === 'true' };
  }) : [
    {
      name: 'Primary Node',
      url: `${process.env.NODE_1_HOST || 'lavalinkv4.serenetia.com'}:${process.env.NODE_1_PORT || 443}`,
      auth: process.env.NODE_1_PASS || 'https://dsc.gg/ajidevserver',
      secure: (process.env.NODE_1_SECURE || 'true') === 'true'
    }
  ],
  idleTimeout: 120000 // 2 minutes
};
