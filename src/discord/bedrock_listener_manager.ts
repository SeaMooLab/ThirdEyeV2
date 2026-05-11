import { Client } from "bedrock-protocol";
import { setupChatMessageListener } from "../chat_listener/chatMessages.js";
import { setupDeathListener } from "../death_listener/deathMessage.js";
import { addPlayerListener } from "../player_device_listener/playerDeviceLogging.js";
import { setupSystemCommandsListener } from "../server_commands_listener/serverCommandsLogging.js";
import { setupAntiCheatListener } from "../anticheat_listener/anticheat_logs.js";
import { setupVoiceChatListener } from "../voiceChat_listener/voice_channels.js";
import { DiscordRefs } from "./discord_refs.js";
import chalk from "chalk";

let discordRefs: DiscordRefs | null = null;

export function setDiscordRefs(refs: DiscordRefs) {
    discordRefs = refs;
}

export function bindAllListeners(bedrockClient: Client) {
    if (!discordRefs) return;

    setupChatMessageListener(bedrockClient, discordRefs.minecraftChatChannelID);
    setupDeathListener(bedrockClient, discordRefs.minecraftChatChannelID);
    addPlayerListener(bedrockClient, discordRefs.minecraftChatChannelID, discordRefs.WhitelistRead);
    setupVoiceChatListener(bedrockClient, discordRefs.guild);
    if (discordRefs.anticheatChannelId) {
        setupAntiCheatListener(bedrockClient, discordRefs.anticheatChannelId);
    } else {
        console.log(chalk.red(`Anticheat logs channel ID is not set in the config, skipping Anticheat Listener.`));
    }
    if (discordRefs.systemCommandsChannelId) {
        setupSystemCommandsListener(bedrockClient, discordRefs.systemCommandsChannelId);
    } else {
        console.log(chalk.red(`System commands logs channel ID is not set in the config, skipping System Commands Listener.`));
    }
}
