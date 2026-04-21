import { system, CustomCommand, CommandPermissionLevel, StartupEvent, CustomCommandParamType } from "@minecraft/server";
import { linkCmd } from "./link_cmd";
import { setThirdeyeUsernameCmd } from "./set_thirdeye_username";
function init(event: StartupEvent) {
    console.log("Registering custom commands...");
    const thirdeyeLinkAccount: CustomCommand = {
        name: "thirdeye:link",
        description: "links your Minecraft account to your Discord account.",
        mandatoryParameters: [{ type: CustomCommandParamType.Integer, name: "Code" }],
        permissionLevel: CommandPermissionLevel.Any,
    };
    const setThirdeyeUsername: CustomCommand = {
        name: "thirdeye:setthirdeyeusername",
        description: "sets the the ThirdEye client username",
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Username" }],
        permissionLevel: CommandPermissionLevel.GameDirectors,
    };
    event.customCommandRegistry.registerCommand(thirdeyeLinkAccount, linkCmd);
    event.customCommandRegistry.registerCommand(setThirdeyeUsername, setThirdeyeUsernameCmd);
}

// Subscribe to startup event to register commands
const customCommands = () => {
    system.beforeEvents.startup.subscribe(init);
};

export { customCommands };
