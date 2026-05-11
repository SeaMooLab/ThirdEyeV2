import { getPendingLink, deletePendingLink } from "../stores/pendingLinks.js";
import { saveLinkedAccount } from "../stores/linkedAccounts.js";
import { Client } from "bedrock-protocol";
import chalk from "chalk";
import { runCMD } from "./bedrock.js";

export function registerAccountLinkListener(bedrockClient: Client) {
    console.log(chalk.cyan("Account link listener initialized."));
    bedrockClient.on("text", (packet) => {
        //console.log(chalk.yellow(`Received text packet: ${packet.message}`));
        handleMinecraftMessage(packet.message);
    });
}

function handleMinecraftMessage(message: string) {
    //console.log(chalk.yellow(`Handling Minecraft message: ${message}`));

    let parsedText = message;

    try {
        const json = JSON.parse(message);

        if (json.rawtext && Array.isArray(json.rawtext)) {
            parsedText = json.rawtext.map((r: any) => r.text ?? "").join("");
        }
    } catch {
        // Not JSON, ignore
    }

    //console.log(chalk.cyan(`Parsed message: ${parsedText}`));

    if (!parsedText.startsWith("?link:")) {
        //console.log(chalk.red(`Invalid link message: ${parsedText}`));
        return;
    }

    const [, code, username] = parsedText.split(":");

    const discordId = getPendingLink(code);

    if (!discordId) {
        console.log(chalk.red(`Invalid or expired link code: ${code}`));
        runCMD(`tellraw "${username}" {"rawtext":[{"text":"§cInvalid or expired link code. Please try linking again."}]}`);
        return;
    }

    saveLinkedAccount(username, discordId);
    deletePendingLink(code);

    console.log(chalk.green(`Linked Minecraft '${username}' → Discord ${discordId}`));

    runCMD(`tellraw "${username}" {"rawtext":[{"text":"§aSuccessfully linked your Minecraft account to Discord!"}]}`);
}
