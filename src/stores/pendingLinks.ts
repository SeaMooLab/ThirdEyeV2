const pendingLinks = new Map<string, string>();

export function setPendingLink(code: string, discordId: string) {
    pendingLinks.set(code, discordId);
}

export function getPendingLink(code: string) {
    return pendingLinks.get(code);
}

export function deletePendingLink(code: string) {
    pendingLinks.delete(code);
}

export function getAllPendingLinks() {
    return pendingLinks;
}
