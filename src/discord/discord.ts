import { Client, Collection, GatewayIntentBits, Interaction, SlashCommandBuilder, TextChannel } from "discord.js";
import { Client as BedrockClient } from "bedrock-protocol";
import config from "../config.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";
import chalk from "chalk";
import { idList } from "../badActors.js";
import { createEmbed } from "../functions/embedBuilder.js";
import { runCMD } from "../bedrock/bedrock.js";
import { Command } from "../functions/interface.js";
import { checkAndDeleteEmptyChannels } from "../voiceChat_listener/voiceChatCleanUp.js";
import { censorMessage } from "../profanity/profanity_filter.js";
import { bindAllListeners, setDiscordRefs } from "./bedrock_listener_manager.js";
// ─────────────────────────────────────────────
// Discord Client Setup
// ─────────────────────────────────────────────
const { MessageContent, GuildMessages, Guilds, GuildVoiceStates } = GatewayIntentBits;
const minecraftChatChannel: string = config.channel;
let minecraftChatChannelID: TextChannel;
const anticheatChannel: string = config.antiCheatLogsChannel;
let anticheatChannelId: TextChannel;
const systemCommandsChannel: string = config.systemCommandsChannel;
let systemCommandsChannelId: TextChannel;
const profanityChannel: string = config.profanityLogsChannel;
let profanityChannelId: TextChannel;
let profanityFilterEnabled = config.profanityFilter;

export async function initDiscord(bedrockClient: BedrockClient, WhitelistRead: any) {
    const discordClient = new Client({
        intents: [Guilds, GuildMessages, MessageContent, GuildVoiceStates],
    });

    // ─────────────────────────────────────────────
    // Discord Events
    // ─────────────────────────────────────────────
    discordClient.once("clientReady", () => {
        const shardId = discordClient.shard?.ids[0] ?? 0;
        console.log(chalk.green(`ThirdEye logged in as ${discordClient.user?.tag} | Shard ${shardId}`));

        // ─────────────────────────────────────────────
        // Minecraft chat channel
        // ─────────────────────────────────────────────
        const channelObj = discordClient.channels.cache.get(minecraftChatChannel);

        if (channelObj) {
            minecraftChatChannelID = channelObj as TextChannel;
            console.log(chalk.green(`Found Minecraft chat channel.`));
        } else {
            console.log(chalk.red(`I could not find the in-game channel in Discord.`));
        }

        // ─────────────────────────────────────────────
        // Guild (VOICE ONLY - no bedrock listeners here)
        // ─────────────────────────────────────────────
        const guild = discordClient.guilds.cache.get(config.guild);

        if (guild) {
            console.log(chalk.cyan(`Found guild: ${guild.name}`));
        } else {
            console.error(`Guild with ID ${config.guild} not found.`);
        }

        // ─────────────────────────────────────────────
        // AntiCheat channel
        // ─────────────────────────────────────────────
        const anticheatChannelObj = discordClient.channels.cache.get(anticheatChannel);

        if (anticheatChannelObj) {
            anticheatChannelId = anticheatChannelObj as TextChannel;
            console.log(chalk.green(`Found AntiCheat logs channel in Discord.`));
        } else {
            console.log(chalk.red(`I could not find the anti-cheat logs channel in Discord.`));
        }

        // ─────────────────────────────────────────────
        // System commands channel
        // ─────────────────────────────────────────────
        const systemCommandsChannelObj = discordClient.channels.cache.get(systemCommandsChannel);

        if (systemCommandsChannelObj) {
            systemCommandsChannelId = systemCommandsChannelObj as TextChannel;
            console.log(chalk.green(`Found Bedrock Server Commands logs channel in Discord.`));
        } else {
            console.log(chalk.red(`I could not find the Bedrock Server Commands logs channel in Discord.`));
        }

        // ─────────────────────────────────────────────
        // Profanity channel
        // ─────────────────────────────────────────────
        const profanityChannelObj = discordClient.channels.cache.get(profanityChannel);

        if (profanityChannelObj) {
            profanityChannelId = profanityChannelObj as TextChannel;
            console.log(chalk.green(`Found Profanity logs channel in Discord.`));
        } else {
            console.log(chalk.red(`I could not find the profanity logs channel in Discord.`));
        }

        if (!guild) {
            console.error(`Guild with ID ${config.guild} not found.`);
            throw new Error(chalk.red("Guild not found"));
        }

        // ─────────────────────────────────────────────
        // ONLY SHARE REFERENCES (NO BEDROCK LISTENERS)
        // ─────────────────────────────────────────────
        setDiscordRefs({
            minecraftChatChannelID,
            WhitelistRead,
            guild,
            anticheatChannelId,
            systemCommandsChannelId,
            profanityChannelId,
        });
        bindAllListeners(bedrockClient);
    });

    // ─────────────────────────────────────────────
    // System Voice Status Update Listener
    // ─────────────────────────────────────────────
    discordClient.on("voiceStateUpdate", (newState) => {
        checkAndDeleteEmptyChannels(newState.guild);
    });
    // ─────────────────────────────────────────────
    // Discord Messages
    // ─────────────────────────────────────────────
    discordClient.on("messageCreate", async (message) => {
        if (message.author.bot) return;

        if (minecraftChatChannelID && message.channel.id === minecraftChatChannelID.id) {
            const originalMessage = message.content;
            const cleanMessage = profanityFilterEnabled ? censorMessage(originalMessage) : originalMessage;
            const cleanUsername = profanityFilterEnabled ? censorMessage(message.author.username) : message.author.username;

            try {
                // ─────────────────────────────────────────────
                // If message was modified → delete & resend
                // ─────────────────────────────────────────────
                if (profanityFilterEnabled && originalMessage !== cleanMessage) {
                    await message.delete();

                    await message.channel.send({
                        content: `**${message.author.username}**: ${cleanMessage}`,
                        allowedMentions: { parse: ["users", "roles"] },
                    });

                    // ─────────────────────────────────────────────
                    // LOGGING CHANNEL OUTPUT
                    // ─────────────────────────────────────────────
                    if (profanityChannelId) {
                        profanityChannelId.send({
                            embeds: [
                                {
                                    title: "🛡️ Message Moderated",
                                    color: 0xff0000,
                                    fields: [
                                        {
                                            name: "User",
                                            value: `${message.author.tag} (${message.author.id})`,
                                        },
                                        {
                                            name: "Original Message",
                                            value: `\`\`\`${originalMessage}\`\`\``,
                                        },
                                        {
                                            name: "Cleaned Message",
                                            value: `\`\`\`${cleanMessage}\`\`\``,
                                        },
                                        {
                                            name: "Channel",
                                            value: `<#${message.channel.id}>`,
                                        },
                                    ],
                                    timestamp: new Date().toISOString(),
                                },
                            ],
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to moderate Discord message:", err);
            }

            // ─────────────────────────────────────────────
            // Send to Minecraft (ALWAYS use cleaned version)
            // ─────────────────────────────────────────────
            let cmd;

            if (idList.includes(message.author.id)) {
                cmd = `/tellraw @a {"rawtext":[{"text":"§8[§9Discord§8] §4${cleanUsername} (Known Hacker/Troll) : §f${cleanMessage}"}]}`;

                if (config.logBadActors === true) {
                    const embed = createEmbed({
                        title: config.setTitle,
                        description: "Message sent to the bot from Discord from Author: " + cleanUsername + " Content: " + cleanMessage + " Unique ID: " + message.author.id,
                        color: config.setColor,
                        author: { name: "‎", iconURL: config.logoURL },
                        thumbnailUrl: "https://static.wikia.nocookie.net/minecraft_gamepedia/images/7/76/Impulse_Command_Block.gif/revision/latest?cb=20191017044126",
                    });

                    anticheatChannelId.send({ embeds: [embed] });
                }
            } else {
                cmd = `/tellraw @a {"rawtext":[{"text":"§8[§9Discord§8] §7${cleanUsername}: §f${cleanMessage}"}]}`;
            }

            runCMD(cmd);
        }
    });

    // ─────────────────────────────────────────────
    // Command Handling
    // ─────────────────────────────────────────────

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    discordClient.commands = new Collection<string, Command>();

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
        console.log(chalk.blue(`Loaded command: ${command.data.name}`));

        // Add to memory for handling interactions
        discordClient.commands.set(command.data.name, command);

        // Add to array for registration with Discord
        commands.push(command.data);
    }

    // ─────────────────────────────────────────────
    // Register commands for testing (guild commands)
    // ─────────────────────────────────────────────
    if (discordClient.application) {
        await discordClient.application.commands.set(commands.map((c) => c.toJSON()));
        console.log(chalk.green("✅ Slash commands registered"));
    } else {
        discordClient.once("clientReady", async () => {
            await discordClient.application?.commands.set(commands.map((c) => c.toJSON()));
            console.log(chalk.green("✅ Slash commands registered"));
        });
    }

    discordClient.on("interactionCreate", async (interaction: Interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = discordClient.commands.get(interaction.commandName);
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

    /**
     * Logs the client into Discord.
     * In a sharded setup, this file must be launched
     * by the ShardingManager — never directly with `node bot.js`.
     */

    discordClient.login(config.token);
}
