import { search } from "@cryptokass/llx";
import { initWalletProvider, WalletProvider } from "../providers/wallet";
import { SearchParams, SearchResult } from "../types";
import {
    composeContext,
    generateObjectDeprecated,
    ModelClass,
} from "@elizaos/core";
import { HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import { searchTemplate } from "../templates";

export class SearchAction {
    constructor(private walletProvider: WalletProvider) {}

    async search(params: SearchParams): Promise<SearchResult> {
        const publicClient = this.walletProvider.getPublicClient(params.chain);

        const results = await search(publicClient.chain.id, params.query);

        return {
            result: JSON.stringify(results, null, 2),
        };
    }
}

export const searchAction = {
    name: "search",
    description:
        "Search block explorer for a specific address, token, or transaction",
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: unknown,
        callback?: HandlerCallback
    ) => {
        console.log("Search action handler called");
        const walletProvider = await initWalletProvider(runtime);
        const action = new SearchAction(walletProvider);

        // Compose swap context
        const swapContext = composeContext({
            state,
            template: searchTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: swapContext,
            modelClass: ModelClass.LARGE,
        });

        const searchOptions: SearchParams = {
            chain: content.chain,
            query: content.query,
        };

        try {
            const searchResp = await action.search(searchOptions);
            if (callback) {
                callback({
                    text: `Successfully searched for ${searchOptions.query} on ${searchOptions.chain}\nResults: ${searchResp.result}`,
                    content: {
                        success: true,
                        chain: content.chain,
                    },
                });
            }
            return true;
        } catch (error) {
            console.error("Error in swap handler:", error.message);
            if (callback) {
                callback({ text: `Error: ${error.message}` });
            }
            return false;
        }
    },
    template: searchTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Swap 1 ETH for USDC on Base",
                    action: "TOKEN_SWAP",
                },
            },
        ],
    ],
    similes: ["TOKEN_SWAP", "EXCHANGE_TOKENS", "TRADE_TOKENS"],
}; // TODO: add more examples
