import { createClient, ClientOptions, Client } from "bedrock-protocol";
import config from "../config.js";
import { registerBedrockListeners } from "./bedrock_packet_listeners.js";

let bot: Client;

export function initBedrock(): Client {
    let options: ClientOptions;

    if (config.isRealm) {
        options = {
            username: config.username,
            profilesFolder: "authentication_tokens",
            realms: { realmInvite: config.realmInviteCode },
        } as unknown as ClientOptions; // cast only here
    } else {
        options = {
            host: config.ip,
            port: config.port,
            username: config.username,
            offline: config.AuthType,
            profilesFolder: "authentication_tokens",
        };
    }

    bot = createClient(options);
    registerBedrockListeners(bot);
    return bot;
}

// shared functions
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

// optional getter (useful later)
export function getBot(): Client {
    return bot;
}
