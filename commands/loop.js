const { SlashCommandBuilder } = require('discord.js');
const { requireSameVC, safeReply } = require('../utils/checks');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Toggle loop mode')
    .addStringOption(option => 
      option.setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' }
        )),
  async execute(interaction, client) {
    const err = requireSameVC(interaction, client);
    if (err) return safeReply(interaction, err, true);

    const mode = interaction.options?.getString('mode') || (interaction.customId === 'player_loop' ? this.getNextMode(client, interaction.guildId) : 'off');
    client.loop.set(interaction.guildId, mode);
    await safeReply(interaction, `🔁 Loop mode set to: **${mode}**`);
  },
  getNextMode(client, guildId) {
    const current = client.loop.get(guildId) || 'off';
    if (current === 'off') return 'track';
    if (current === 'track') return 'queue';
    return 'off';
  }
};

