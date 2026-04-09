import { Client } from "bedrock-protocol";
import chalk from "chalk";
import config from "../config.js";
let clientPermissionLevel: string;
let clientGamemode: string;

export function registerBedrockListeners(bot: Client) {
    bot.on("packet_violation_warning", (packet) => {
        console.log(chalk.red(`Packet Violation Warning: ${packet}`));
    });

    bot.on("disconnect", (packet) => {
        console.log(chalk.red("Disconnected from server: " + JSON.stringify(packet, null, 2)));
    });
    bot.on("spawn", (packet) => {
        console.log(chalk.green("Successfully connected to the server and spawned in as " + config.username));
    });
    bot.on("start_game", (packet: StartGame) => {
        clientPermissionLevel = packet.permission_level.toString();
        clientGamemode = packet.player_gamemode.toString();
        console.log(chalk.yellow(`Client Permission Level: ${clientPermissionLevel}, Client Gamemode: ${clientGamemode}`));
    });
}
