import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { formatTime, getPlayerSession } from "../../stores/player_sessions.js";

export default {
    data: new SlashCommandBuilder()
        .setName("playtime")
        .setDescription("Check playtime on the Minecraft server.")
        .addStringOption((option) => option.setName("player").setDescription("Player name").setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        const player = interaction.options.getString("player") || interaction.user.username;

        const data = getPlayerSession(player);

        if (!data) {
            return interaction.reply({
                content: `❌ No data found for **${player}**`,
                ephemeral: true,
            });
        }

        const playtime = formatTime(data.totalPlayTime);

        return interaction.reply({
            content: `🕒 **${player}** has played for **${playtime}**`,
        });
    },
};
