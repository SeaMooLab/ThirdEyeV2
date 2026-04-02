// ─────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────
import chalk from "chalk";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";
import { Command } from "./functions/interface.js";
import { Client, Collection, EmbedBuilder, GatewayIntentBits, Guild, Interaction, SlashCommandBuilder, TextChannel } from "discord.js";
import { createClient, ClientOptions } from "bedrock-protocol";
import config from "./config.js";
import { idList } from "./badActors.js";
import { addPlayerListener } from "./player_device_listener/playerDeviceLogging.js";
import { setupChatMessageListener } from "./chat_listener/chatMessages.js";
import { setupDeathListener } from "./death_listener/deathMessage.js";
import { setupVoiceChatListener } from "./voiceChat_listener/voice_channels.js";
import { checkAndDeleteEmptyChannels } from "./voiceChat_listener/voiceChatCleanUp.js";
import { setupAntiCheatListener } from "./anticheat_listener/anticheat_logs.js";
import { setupSystemCommandsListener } from "./server_commands_listener/serverCommandsLogging.js";

// ─────────────────────────────────────────────
// Constants & State
// ─────────────────────────────────────────────

const { MessageContent, GuildMessages, Guilds, GuildVoiceStates } = GatewayIntentBits;
const channel: string = config.channel;
let channelId: TextChannel;
const anticheatChannel: string = config.antiCheatLogsChannel;
let anticheatChannelId: TextChannel;
const systemCommandsChannel: string = config.systemCommandsChannel;
let systemCommandsChannelId: TextChannel;

let WhitelistRead = JSON.parse(fs.readFileSync("whitelist.json", "utf-8"));
let options;

console.log(chalk.cyan("ThirdEye v2.0.0 Starting..."));

// ─────────────────────────────────────────────
// Bedrock Client Options
// ─────────────────────────────────────────────

if (config.isRealm) {
    //Handel the realm config here!
    console.log(chalk.yellow("Connecting to a realm"));
    options = {
        profilesFolder: "authentication_tokens",
        realms: {
            realmInvite: config.realmInviteCode,
        },
    } as ClientOptions;
} else {
    console.log(chalk.yellow("Connecting to a server"));
    options = {
        host: config.ip,
        port: config.port,
        username: config.username,
        offline: config.AuthType,
        profilesFolder: "authentication_tokens",
    } as ClientOptions;
}

// ─────────────────────────────────────────────
// Join Minecraft Server
// ─────────────────────────────────────────────

const bot = createClient(options);

// ─────────────────────────────────────────────
// Discord Client Setup
// ─────────────────────────────────────────────

const client = new Client({
    intents: [Guilds, GuildMessages, MessageContent, GuildVoiceStates],
});

/**
 * Logs the client into Discord.
 * In a sharded setup, this file must be launched
 * by the ShardingManager — never directly with `node bot.js`.
 */

client.login(config.token);

// ─────────────────────────────────────────────
// Discord Events
// ─────────────────────────────────────────────
client.once("clientReady", () => {
    const shardId = client.shard?.ids[0] ?? 0;
    console.log(chalk.green(`ThirdEye logged in as ${client.user.tag} | Shard ${shardId}`));
    const channelObj = client.channels.cache.get(channel);
    //Listerns that use the main public ingame channel.
    if (channelObj) {
        channelId = channelObj as TextChannel;
        // Call function if channel exists
        setupChatMessageListener(bot, channelId);
        setupDeathListener(bot, channelId);
        addPlayerListener(bot, channelId, WhitelistRead);
    } else {
        console.log(chalk.red(`I could not find the in-game channel in Discord.`));
    }
    const guild = client.guilds.cache.get(config.guild);
    if (guild) {
        console.log(`Found guild: ${guild.name}`);
        setupVoiceChatListener(bot, guild as Guild);
    } else {
        console.error(`Guild with ID ${config.guild} not found.`);
    }
    // AntiCheat logs channel
    const anticheatChannelObj = client.channels.cache.get(anticheatChannel);
    if (anticheatChannelObj) {
        anticheatChannelId = anticheatChannelObj as TextChannel;
        setupAntiCheatListener(bot, anticheatChannelId);
        console.log(chalk.green(`Found AntiCheat logs channel in Discord.`));
    } else {
        console.log(chalk.red(`I could not find the anti-cheat logs channel in Discord.`));
    }
    // Bedrock Server Commands logs channel
    const systemCommandsChannelObj = client.channels.cache.get(systemCommandsChannel);
    if (systemCommandsChannelObj) {
        systemCommandsChannelId = systemCommandsChannelObj as TextChannel;
        setupSystemCommandsListener(bot, systemCommandsChannelId);
        console.log(chalk.green(`Found Bedrock Server Commands logs channel in Discord.`));
    } else {
        console.log(chalk.red(`I could not find the Bedrock Server Commands logs channel in Discord.`));
    }
});

// ─────────────────────────────────────────────
// System Voice Status Update Listener
// ─────────────────────────────────────────────
client.on("voiceStateUpdate", (newState) => {
    checkAndDeleteEmptyChannels(newState.guild);
});
// ─────────────────────────────────────────────
// Discord Messages
// ─────────────────────────────────────────────
client.on("messageCreate", (message) => {
    if (message.author.bot === true) {
        /**This check will prevent a loop back message.
         * If the incoming message is from a bot it will ignore it.
         */
    } else {
        if (channel && message.channel.id === channelId.id) {
            let cmd;
            //Check to make sure the Discord User is not on the know bad actors ID list.
            if (idList.includes(message.author.id)) {
                //We will then send a command to the server to trigger the message sent in discord.
                cmd = `/tellraw @a {"rawtext":[{"text":"§8[§9Discord§8] §4${message.author.username} (Known Hacker/Troll) : §f${message.content}"}]}`;
                //If configured Log the message to anticheat channel.
                if (config.logBadActors === true) {
                    const msgEmbed = new EmbedBuilder()
                        .setColor(config.setColor)
                        .setTitle(config.setTitle)
                        .setDescription("Message sent to the bot from Discord from Author: " + message.author.username + " Content: " + message.content + " Unique ID: " + message.author.id)
                        .setAuthor({ name: "‎", iconURL: config.logoURL })
                        .setThumbnail("https://static.wikia.nocookie.net/minecraft_gamepedia/images/7/76/Impulse_Command_Block.gif/revision/latest?cb=20191017044126");
                    anticheatChannelId.send({ embeds: [msgEmbed] });
                }
            } else {
                //We will then send a command to the server to trigger the message sent in discord.
                cmd = `/tellraw @a {"rawtext":[{"text":"§8[§9Discord§8] §7${message.author.username}: §f${message.content}"}]}`;
            }
            runCMD(cmd);
        }
    }
});

// ─────────────────────────────────────────────
// Command Handling
// ─────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

client.commands = new Collection<string, Command>();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

const commands: SlashCommandBuilder[] = [];

// ─────────────────────────────────────────────
// Load commands into memory & prepare for registration
// ─────────────────────────────────────────────
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = await import(pathToFileURL(filePath).href);
    const command: Command = commandModule.default;

    // Add to memory for handling interactions
    client.commands.set(command.data.name, command);

    // Add to array for registration with Discord
    commands.push(command.data);
}

// ─────────────────────────────────────────────
// Register commands for testing (guild commands)
// ─────────────────────────────────────────────
if (client.application) {
    await client.application.commands.set(commands.map((c) => c.toJSON()));
    console.log("✅ Slash commands registered");
} else {
    client.once("clientReady", async () => {
        await client.application?.commands.set(commands.map((c) => c.toJSON()));
        console.log("✅ Slash commands registered");
    });
}

client.on("interactionCreate", async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(err);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: "❌ Something went wrong.", ephemeral: true });
        } else {
            await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

export function runCMD(cmd: string) {
    bot.queue("command_request", {
        command: cmd,
        origin: {
            type: "player",
            uuid: "",
            request_id: "",
            player_entity_id: [0, 0],
        },
        internal: false,
        version: "latest",
    });
}
export function runText(message: string) {
    bot.queue("text", {
        needs_translation: false,
        category: "authored",
        chat: "chat",
        whisper: "whisper",
        announcement: "announcement",
        type: "chat",
        source_name: config.username,
        message: message,
        xuid: "",
        platform_chat_id: "",
        has_filtered_message: false,
    });
}
