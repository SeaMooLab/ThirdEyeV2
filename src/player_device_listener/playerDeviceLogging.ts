import { readFileSync, writeFileSync, existsSync } from "fs";
import { Client } from "bedrock-protocol";
import { TextChannel } from "discord.js";
import config from "../config.js";
import { runCMD } from "../bedrock/bedrock.js";
import chalk from "chalk";
import { createEmbed } from "../functions/embedBuilder.js";
import { onPlayerJoin, onPlayerLeave } from "../stores/player_sessions.js";

// ----------------------------
// Config
// ----------------------------
const filePath = "reportedPlayers.json";

// ----------------------------
// Helper: Load reported players from FS
// ----------------------------
function loadReportedPlayers(): string[] {
    if (!existsSync(filePath)) return [];
    try {
        return JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
        return [];
    }
}

// ----------------------------
// Helper: Save reported players to FS
// ----------------------------
function saveReportedPlayers(players: string[]) {
    writeFileSync(filePath, JSON.stringify(players, null, 2));
}

// ----------------------------
// Helper: Send message to Discord
// ----------------------------
function sendToChannel(channelId: TextChannel, content: string | any, errorMessage: string) {
    if (typeof channelId === "object") {
        channelId.send(content).catch(() => console.log(errorMessage));
    } else {
        console.log(errorMessage);
    }
}

// ----------------------------
// Helper: Convert deviceOS code to friendly name
// ----------------------------
function getDeviceName(deviceOS: string): string {
    switch (deviceOS) {
        case "Win32":
            return "Windows PC";
        case "IOS":
            return "Apple Device";
        case "Nintendo":
            return "Nintendo Switch";
        case "Android":
            return "Android";
        case "Orbis":
            return "PlayStation";
        case "Win10":
            return "Windows PC";
        default:
            console.log(chalk.yellow("addPlayerListener:getDeviceName: DeviceOS defaulted to packet.device_os value."));
            return deviceOS;
    }
}

// ----------------------------
// Main: Add player listener
// ----------------------------
export function addPlayerListener(bedrockClient: Client, channelId: TextChannel, WhitelistRead: any) {
    const Whitelist = WhitelistRead.whitelist;
    let reportedPlayers = loadReportedPlayers();
    console.log(chalk.cyan("Player Device Listener Initialized."));

    // ----------------------------
    // add_player packet is not reliable for player joins as it is not sent if the joining player is out of the bots render distance.
    // Thefore this is disabled by default.
    // ----------------------------
    if (config.useSystemPlayerJoinMessage === false) {
        bedrockClient.on("add_player", (packet: PlayerData) => {
            reportedPlayers = loadReportedPlayers();
            const username = packet.username;

            // Skip if already reported
            if (reportedPlayers.includes(username)) return;

            reportedPlayers.push(username);
            saveReportedPlayers(reportedPlayers);

            const deviceOS = getDeviceName(packet.device_os);
            let description = `[In Game] ${username}: Has joined the server using ${deviceOS}`;

            // Kick blacklisted devices
            if (config.blacklistDeviceTypes.includes(packet.device_os) && !Whitelist.includes(username)) {
                const cmd = `/kick ${username} device is blacklisted.`;
                runCMD(cmd);
                description = `[Server] ${username}: Kicked as device is blacklisted (${packet.device_os})`;
            }

            //Discord output
            if (config.useEmbed) {
                const embed = createEmbed({
                    title: config.setTitle,
                    description: description,
                    color: [0, 255, 0],
                });

                sendToChannel(channelId, { embeds: [embed] }, "addPlayerListener:add_player: Could not find the Discord channel.");
            } else {
                sendToChannel(channelId, description, "addPlayerListener:add_player: Could not find the Discord channel.");
            }
        });
    }
    bedrockClient.on("text", (packet: WhisperPacket | ChatPacket) => {
        if (packet.message.includes("§e%multiplayer.player.joined")) {
            /* we don't want to duplicate the join message as this is handled in the add_player packet.
           not this is only tirggered if the bot is in render distace as the playe rjoining soits not always triggered.
           */
            if (config.useSystemPlayerJoinMessage === true) {
                const msg = packet.parameters + ": Has joined the server.";
                onPlayerJoin(packet.parameters);
                const username = "Server";
                if (config.useEmbed === true) {
                    const embed = createEmbed({
                        title: config.setTitle,
                        description: "[In Game] " + username + ": " + msg,
                        color: [0, 255, 0],
                        author: { name: "‎", iconURL: config.logoURL },
                    });

                    if (typeof channelId === "object") {
                        return channelId.send({ embeds: [embed] });
                    } else {
                        return console.log("I could not find the in-game channel in Discord. 16");
                    }
                } else {
                    if (typeof channelId === "object") {
                        return channelId.send(`[In Game] **${username}**: ${msg}`);
                    } else {
                        return console.log("I could not find the in-game channel in Discord. 17");
                    }
                }
            }
            //if not enabled it wont be sent.
            return;
        }
    });

    // ----------------------------
    // Player Leave
    // ----------------------------
    bedrockClient.on("text", (packet: WhisperPacket | ChatPacket) => {
        if (!packet.message.includes("§e%multiplayer.player.left")) return;
        reportedPlayers = loadReportedPlayers();

        const username = Array.isArray(packet.parameters) ? packet.parameters[0] : packet.parameters;

        const msg = `${username}: Has left the server.`;
        onPlayerLeave(username);

        // Remove from reported players
        console.log(chalk.bgYellowBright("[debug]: reportedPlayers Before remove:", JSON.stringify(reportedPlayers)));
        console.log(chalk.bgYellowBright("[debug]: Removing player from reportedPlayers:", username));
        reportedPlayers = reportedPlayers.filter((p) => p !== username);
        saveReportedPlayers(reportedPlayers);
        console.log(chalk.bgYellowBright("[debug]: reportedPlayers After remove:", JSON.stringify(reportedPlayers)));

        // Discord output
        if (config.useEmbed) {
            const embed = createEmbed({
                title: config.setTitle,
                description: "[In Game] " + msg,
                color: [255, 0, 0],
                author: { name: "‎", iconURL: config.logoURL },
            });

            sendToChannel(channelId, { embeds: [embed] }, "Could not find the Discord channel.");
        } else {
            sendToChannel(channelId, `[In Game] **Server**: ${msg}`, "Could not find the Discord channel.");
        }
    });
}
