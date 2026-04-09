import { EmbedAuthorData, EmbedBuilder, ColorResolvable } from "discord.js";

export function createEmbed(options: { title?: string; description?: string; color?: ColorResolvable; author?: EmbedAuthorData; thumbnailUrl?: string }) {
    const embed = new EmbedBuilder();

    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.color) embed.setColor(options.color);
    if (options.author) embed.setAuthor(options.author);
    if (options.thumbnailUrl) embed.setThumbnail(options.thumbnailUrl);

    return embed;
}
