import { initWalletProvider, WalletProvider } from "../providers/wallet";
import { BalanceParams, BalanceResult } from "../types";
import {
    composeContext,
    generateObjectDeprecated,
    ModelClass,
} from "@elizaos/core";
import { HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import { balanceTemplate } from "../templates";
import { erc20Abi, formatEther, formatUnits } from "viem";

export class BalanceAction {
    constructor(private walletProvider: WalletProvider) {}

    async balance(params: BalanceParams): Promise<BalanceResult> {
        const publicClient = this.walletProvider.getPublicClient(params.chain);

        // if token is null, get the balance of the address on the chain
        if (params.token === null) {
            const balance = await publicClient.getBalance({
                address: params.address,
            });
            return {
                balance: balance.toString(),
                formattedBalance: formatEther(balance),
            };
        }

        // otherwise, use the wallet provider to get the balance of the token
        const balance = await publicClient.readContract({
            address: params.token,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [params.address],
        });
        const decimals = await publicClient.readContract({
            address: params.token,
            abi: erc20Abi,
            functionName: "decimals",
        });

        return {
            balance: balance.toString(),
            formattedBalance: formatUnits(balance, decimals),
        };
    }
}

export const balanceAction = {
    name: "balance",
    description: "Get the balance for an address and a specific token",
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: unknown,
        callback?: HandlerCallback
    ) => {
        console.log("Balance action handler called");
        const walletProvider = await initWalletProvider(runtime);
        const action = new BalanceAction(walletProvider);

        // Compose swap context
        const balanceContext = composeContext({
            state,
            template: balanceTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: balanceContext,
            modelClass: ModelClass.LARGE,
        });

        const balanceOptions: BalanceParams = {
            chain: content.chain,
            address: content.address,
            token: content.token,
        };

        try {
            const balanceResp = await action.balance(balanceOptions);
            if (callback) {
                callback({
                    text:
                        `Successfully got the balance for ${balanceOptions.address}` +
                        `\nToken: ${balanceOptions.token ?? "ETH"}` +
                        `\nChain: ${balanceOptions.chain}` +
                        `\nBalance: ${balanceResp.formattedBalance} (${balanceResp.balance} Units)`,
                    content: {
                        success: true,
                        chain: content.chain,
                        token: balanceOptions.token ?? "ETH",
                        balance: balanceResp.balance,
                        formattedBalance: balanceResp.formattedBalance,
                    },
                });
            }
            return true;
        } catch (error) {
            console.error("Error in balance handler:", error.message);
            if (callback) {
                callback({ text: `Error: ${error.message}` });
            }
            return false;
        }
    },
    template: balanceTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Get the balance of 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on Base",
                    action: "GET_BALANCE",
                },
            },
        ],
    ],
    similes: ["GET_BALANCE", "GET_TOKEN_BALANCE"],
}; // TODO: add more examples
