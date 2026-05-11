import { Collection } from "discord.js";
import { Command } from "../../functions/interface";

declare module "discord.js" {
    interface Client {
        commands: Collection<string, Command>;
    }
}
