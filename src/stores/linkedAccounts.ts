import chalk from "chalk";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve("./data");
const FILE = path.join(DATA_DIR, "linkedAccounts.json");

type LinkedAccount = {
    discordId: string;
};

let linkedAccounts: Record<string, LinkedAccount> = {};

// ✅ Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
    console.log(chalk.yellow(`Data directory not found, creating at ${DATA_DIR}`));
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(FILE)) {
    console.log(chalk.yellow(`Linked accounts file not found, creating at ${FILE}`));
    fs.writeFileSync(FILE, JSON.stringify({}, null, 2));
}

linkedAccounts = JSON.parse(fs.readFileSync(FILE, "utf8"));

export function saveLinkedAccount(username: string, discordId: string) {
    linkedAccounts[username.toLowerCase()] = { discordId };

    fs.writeFileSync(FILE, JSON.stringify(linkedAccounts, null, 2));
    console.log(chalk.green(`Linked account saved: ${username} -> ${discordId}`));
}

export function getLinkedAccount(username: string) {
    return linkedAccounts[username.toLowerCase()];
}
