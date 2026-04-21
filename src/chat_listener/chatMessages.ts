import { TextChannel } from "discord.js";
import { Client } from "bedrock-protocol";
import config from "../config.js";
import { autoCorrect, correction } from "../functions/correction.js";
import { createEmbed } from "../functions/embedBuilder.js";
import chalk from "chalk";
import { censorMessage } from "../profanity/profanity_filter.js";

export function setupChatMessageListener(bedrockClient: Client, channelId: TextChannel) {
    console.log(chalk.cyan("Chat Message Listener initialized."));
    bedrockClient.on("text", (packet: JsonPacket | ChatPacket) => {
        if (!channelId || typeof channelId !== "object") {
            console.log(chalk.red("chatMessage: I could not find the in-game channel in Discord."));
            return;
        }

        // ─────────────────────────────────────────────
        // JSON chat packets (Paradox / Scythe)
        // ─────────────────────────────────────────────
        if (packet.type === "json") {
            const obj = JSON.parse(packet.message);
            const text = obj?.rawtext?.[0]?.text;

            // Ignore invalid / command / empty / Discord loop messages
            if (!text || obj.rawtext?.[0]?.translate || text.includes("Discord")) {
                return;
            }

            // Known AntiCheat / help / command messages to ignore
            const ignoredPrefixes = ["§2[§7Available Commands§2]§r", "§2[§7Paradox§2]§o§7", "?link:"];

            if (ignoredPrefixes.some((prefix) => text.includes(prefix))) {
                return;
            }

            //sendToDiscord(channelId, `[In Game] ${autoCorrect(text, correction)}`);
            const corrected = autoCorrect(text, correction);
            let profanityFilterEnabled = config.profanityFilter;
            const clean = profanityFilterEnabled ? censorMessage(corrected) : corrected;

            sendToDiscord(channelId, `[In Game] ${clean}`);
            return;
        }

        // ─────────────────────────────────────────────
        // Normal chat packets
        // ─────────────────────────────────────────────
        if (packet.type === "chat") {
            //sendToDiscord(channelId, `[In Game] **${packet.source_name}**: ${packet.message}`);
            let profanityFilterEnabled = config.profanityFilter;
            const clean = profanityFilterEnabled ? censorMessage(packet.message) : packet.message;

            sendToDiscord(channelId, `[In Game] **${packet.source_name}**: ${clean}`);
        }
    });
}

// ─────────────────────────────────────────────
// Helper: Send message or embed
// ─────────────────────────────────────────────
function sendToDiscord(channelId: TextChannel, content: string) {
    if (!config.useEmbed) {
        return channelId.send(content);
    }

    const embed = createEmbed({
        title: config.setTitle,
        description: content,
        color: config.setColor,
        author: { name: "‎", iconURL: config.logoURL },
    });

    return channelId.send({ embeds: [embed] });
}
