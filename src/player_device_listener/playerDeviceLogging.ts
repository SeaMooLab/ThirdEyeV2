import { readFileSync, writeFileSync, existsSync } from "fs";
import { Client } from "bedrock-protocol";
import { EmbedBuilder, TextChannel } from "discord.js";
import config from "../config.js";
import { runCMD } from "../index.js";
import chalk from "chalk";

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
export function addPlayerListener(bot: Client, channelId: TextChannel, WhitelistRead: any) {
    const Whitelist = WhitelistRead.whitelist;
    let reportedPlayers = loadReportedPlayers();

    // ----------------------------
    // Player Join / Add
    // ----------------------------
    bot.on("add_player", (packet: PlayerData) => {
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
            const msgEmbed = new EmbedBuilder().setColor([0, 255, 0]).setTitle(config.setTitle).setDescription(description).setAuthor({ name: "‎", iconURL: config.logoURL });
            sendToChannel(channelId, { embeds: [msgEmbed] }, "addPlayerListener:add_player: Could not find the Discord channel.");
        } else {
            sendToChannel(channelId, description, "addPlayerListener:add_player: Could not find the Discord channel.");
        }
    });

    // ----------------------------
    // Player Leave
    // ----------------------------
    bot.on("text", (packet: WhisperPacket | ChatPacket) => {
        if (!packet.message.includes("§e%multiplayer.player.left")) return;
        reportedPlayers = loadReportedPlayers();

        const username = Array.isArray(packet.parameters) ? packet.parameters[0] : packet.parameters;

        const msg = `${username}: Has left the server.`;

        // Remove from reported players
        console.log(chalk.bgYellowBright("[debug]: reportedPlayers Before remove:", JSON.stringify(reportedPlayers)));
        console.log(chalk.bgYellowBright("[debug]: Removing player from reportedPlayers:", username));
        reportedPlayers = reportedPlayers.filter((p) => p !== username);
        saveReportedPlayers(reportedPlayers);
        console.log(chalk.bgYellowBright("[debug]: reportedPlayers After remove:", JSON.stringify(reportedPlayers)));

        // Discord output
        if (config.useEmbed) {
            const msgEmbed = new EmbedBuilder()
                .setColor([255, 0, 0])
                .setTitle(config.setTitle)
                .setDescription("[In Game] " + msg)
                .setAuthor({ name: "‎", iconURL: config.logoURL });

            sendToChannel(channelId, { embeds: [msgEmbed] }, "Could not find the Discord channel.");
        } else {
            sendToChannel(channelId, `[In Game] **Server**: ${msg}`, "Could not find the Discord channel.");
        }
    });
}
