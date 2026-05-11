import { CustomCommandOrigin, CustomCommandStatus, Player, system, world } from "@minecraft/server";

export function linkCmd(_origin: CustomCommandOrigin, code: number) {
    system.run(() => {
        const entity = _origin.sourceEntity;
        if (!(entity instanceof Player)) return;

        const sender = entity;

        const thirdeyeUsername = world.getDynamicProperty("thirdeye_username") as string;

        if (!thirdeyeUsername) {
            sender.sendMessage("§cError: ThirdEye username not set. Use /setThirdeyeUsername <username>");
            return;
        }

        const thirdeyePlayer = world.getPlayers().find((p) => p.name === thirdeyeUsername);

        if (!thirdeyePlayer) {
            sender.sendMessage(`§cError: ThirdEye client player '${thirdeyeUsername}' not found.`);
            return;
        }

        thirdeyePlayer.sendMessage(`?link:${code}:${sender.name}`);
    });

    return {
        status: CustomCommandStatus.Success,
        message: `Attempting to link your account with code: ${code}`,
    };
}
