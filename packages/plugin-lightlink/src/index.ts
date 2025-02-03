export * from "./actions/transfer";
export * from "./providers/wallet";
export * from "./types";

import type { Plugin } from "@elizaos/core";
import { transferAction } from "./actions/transfer";
import { swapAction } from "./actions/swap";
import { evmWalletProvider } from "./providers/wallet";
import { searchAction } from "./actions/search";

export const lightlinkPlugin: Plugin = {
    name: "lightlink",
    description: "Lightlink blockchain integration plugin",
    providers: [evmWalletProvider],
    evaluators: [],
    services: [],
    actions: [transferAction, swapAction, searchAction],
};

export default lightlinkPlugin;
