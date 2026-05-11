import { CustomCommandOrigin, CustomCommandStatus, Player, system, world } from "@minecraft/server";

export function setThirdeyeUsernameCmd(_origin: CustomCommandOrigin, username: string) {
    system.run(() => {
        const entity = _origin.sourceEntity;
        if (!(entity instanceof Player)) return;

        world.setDynamicProperty("thirdeye_username", username);
    });

    return {
        status: CustomCommandStatus.Success,
        message: `ThirdEye username set to: ${username}`,
    };
}
