import { TextChannel, Guild } from "discord.js";

export interface DiscordRefs {
    minecraftChatChannelID: TextChannel;
    WhitelistRead: any;
    guild: Guild;
    anticheatChannelId?: TextChannel;
    systemCommandsChannelId?: TextChannel;
    profanityChannelId?: TextChannel;
}
