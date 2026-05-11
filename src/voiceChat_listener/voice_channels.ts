import { ChannelType, Guild, GuildMember, PermissionsBitField } from "discord.js";
import { Client } from "bedrock-protocol";
import config from "../config.js";
import { runCMD } from "../bedrock/bedrock.js";

export function setupVoiceChatListener(bot: Client, guild: Guild) {
    bot.on("text", async (packet) => {
        const parsed = parsePacket(packet);
        if (!parsed) return;

        const { requester, args, command } = parsed;

        try {
            if (command === "createVoiceChannel") {
                await handleCreateVC(guild, requester, args);
            }

            if (command === "invite") {
                await handleInvite(guild, requester, args);
            }
            if (command === "proxvc") {
                await handleProximityVC(guild, requester, args);
            }
        } catch (err) {
            console.error(err);
        }
    });
}

function parsePacket(packet: WhisperPacket | ChatPacket | JsonPacket): {
    requester: string;
    command: string;
    args: string[];
} | null {
    let message = "";
    let requester = "";

    if (packet.type === "chat") {
        message = packet.message;
        requester = packet.source_name ?? "";
    }

    if (packet.type === "json_whisper") {
        let obj: any;

        try {
            obj = JSON.parse(packet.message);
        } catch {
            return null; // invalid JSON
        }

        const text: unknown = obj?.rawtext?.[0]?.text;

        if (typeof text !== "string") return null;

        const nameMatch = text.match(/§7(.*?)§r/);
        requester = nameMatch?.[1]?.replace(":", "").trim() ?? "";

        const parts = text.split("§r");
        if (parts.length < 2) return null;

        message = parts[1].trim();
    }

    //Final safety check
    if (typeof message !== "string") return null;

    if (!message.startsWith(config.voiceChannelCommandPrefix)) return null;

    const parts = message.trim().split(" ");
    const command = parts[0].replace(config.voiceChannelCommandPrefix, "");
    const args = parts.slice(1);

    return { requester, command, args };
}

async function fetchMember(guild: Guild, username: string): Promise<GuildMember> {
    const members = await guild.members.fetch({ query: username, limit: 1 });
    const member = members.first();
    if (!member) throw new Error(`User "${username}" not found`);
    return member;
}

function isInPrivateVC(member: GuildMember) {
    return member.voice.channel?.name?.startsWith("v");
}

async function handleCreateVC(guild: Guild, requester: string, args: string[]) {
    const channelName = "v" + args[0];
    const memberNames = args.slice(1);

    const members = await Promise.all(memberNames.map((n) => fetchMember(guild, n)));

    const alreadyInVC = members.filter(isInPrivateVC);
    if (alreadyInVC.length) {
        runCMD(`/tellraw ${requester} {"rawtext":[{"text":"§8[§9VC Error§8] §6Users already in private VC: ${alreadyInVC.map((m) => m.user.username).join(", ")}"}]}`);
        return;
    }

    const category = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === config.voiceChannelsCategory);

    const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: category?.id,
        permissionOverwrites: [
            {
                id: config.voiceAdminRoleID,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
            },
            ...members.map((m) => ({
                id: m.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.UseVAD],
            })),
            {
                id: guild.roles.everyone,
                deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
            },
        ],
    });

    for (const m of members) {
        await m.voice.setChannel(channel.id);
        await m.voice.setMute(false);
        await m.voice.setDeaf(false);
    }
}

async function handleInvite(guild: Guild, requester: string, args: string[]) {
    const channelName = "v" + args[0];
    const inviteeName = args[1];

    const requesterMember = await fetchMember(guild, requester);
    if (!isInPrivateVC(requesterMember)) {
        runCMD(`/tellraw ${requester} {"rawtext":[{"text":"§8[§9VC Error§8] §6You are not in ${channelName}"}]}`);
        return;
    }

    const invitee = await fetchMember(guild, inviteeName);
    const channel = guild.channels.cache.find((c) => c.type === ChannelType.GuildVoice && c.name === channelName) as any;

    await channel.permissionOverwrites.edit(invitee.id, {
        ViewChannel: true,
        Connect: true,
        Speak: true,
        UseVAD: true,
    });

    await invitee.voice.setChannel(channel.id);
    await invitee.voice.setMute(false);
    await invitee.voice.setDeaf(false);

    runCMD(`/tellraw ${inviteeName} {"rawtext":[{"text":"§8[§9VC§8] §2You joined ${channelName}"}]}`);
    runCMD(`/tellraw ${requester} {"rawtext":[{"text":"§8[§9VC§8] §2${inviteeName} joined"}]}`);
}
async function handleProximityVC(guild: Guild, requester: string, args: string[]) {
    if (!args.length) return;

    const channelName = "p" + args[0];
    const memberNames = args.slice(1);

    const results = await Promise.allSettled(memberNames.map((n) => fetchMember(guild, n)));

    const members = results.filter((r): r is PromiseFulfilledResult<GuildMember> => r.status === "fulfilled").map((r) => r.value);

    if (!members.length) return;

    const category = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name === config.voiceChannelsCategory);

    if (!category) {
        console.error("Proximity: Voice channel category not found.");
        return;
    }

    const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
            {
                id: config.voiceAdminRoleID,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
            },
            ...members.map((m) => ({
                id: m.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.UseVAD],
            })),
            {
                id: guild.roles.everyone,
                deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
            },
        ],
    });

    for (const targetMember of members) {
        if (!targetMember.voice?.channel) continue;

        if (isInPrivateVC(targetMember)) {
            console.log(`Proximity: ${targetMember.user.username} is in private VC (${targetMember.voice.channel?.name}), skipping.`);
            continue;
        }

        await targetMember.voice.setChannel(channel.id);
        await targetMember.voice.setMute(false);
        await targetMember.voice.setDeaf(false);
    }
}
