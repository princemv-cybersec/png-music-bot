const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggle Radio Mode (Autoplay similar songs when queue ends)'),
  async execute(interaction, client) {
    const guildId = interaction.guildId;
    let settings = client.guildSettings.get(guildId) || { volume: 100, autoplay: false };

    settings.autoplay = !settings.autoplay;
    client.guildSettings.set(guildId, settings);
    client.saveSettings();

    await interaction.reply({ 
      content: `📻 Autoplay (Radio Mode) is now **${settings.autoplay ? 'ON' : 'OFF'}**.` 
    });
  }
};
