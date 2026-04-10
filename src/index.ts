// ─────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────
import chalk from "chalk";
import fs from "fs";
import { initBedrock } from "./bedrock/bedrock.js";
import { initDiscord } from "./discord/discord.js";

// ─────────────────────────────────────────────
// Constants & State
// ─────────────────────────────────────────────
let WhitelistRead = JSON.parse(fs.readFileSync("whitelist.json", "utf-8"));

console.log(chalk.yellow("ThirdEye v2.0.0 Starting..."));

// ─────────────────────────────────────────────
// Initialize Bedrock Client
// ─────────────────────────────────────────────
console.log(chalk.cyan("intializing Bedrock client..."));
const bedrockClient = initBedrock();

// ─────────────────────────────────────────────
// Initialize Discord Client
// ─────────────────────────────────────────────
console.log(chalk.cyan("intializing Discord client..."));
await initDiscord(bedrockClient, WhitelistRead);
