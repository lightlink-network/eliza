import type {
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import {
    composeContext,
    generateObjectDeprecated,
    ModelClass,
} from "@elizaos/core";

import { initWalletProvider, WalletProvider } from "../providers/wallet";
import { swapTemplate } from "../templates";
import type { SwapParams, SwapStep, SwapTransaction } from "../types";
import { elektrik, fetchTokenDecimals } from "@cryptokass/llx";
import { blankKzg } from "../lib/constants";
import { type Hex, parseUnits } from "viem";

export { swapTemplate };

export class SwapAction {
    constructor(private walletProvider: WalletProvider) {}

    async swap(params: SwapParams): Promise<SwapTransaction> {
        this.walletProvider.switchChain(params.chain);

        const publicClient = this.walletProvider.getPublicClient(params.chain);
        const walletClient = this.walletProvider.getWalletClient(params.chain);
        const chain = this.walletProvider.getChainConfigs(params.chain);
        const [fromAddress] = await walletClient.getAddresses();

        // 0. get input token info
        const inputDecimals = await fetchTokenDecimals(
            chain.id,
            params.fromToken
        );
        const amountIn = parseUnits(params.amount, inputDecimals);

        // 1. Get the quote
        const quote = await elektrik.quoteExactInput(chain.id, {
            fromToken: params.fromToken,
            toToken: params.toToken,
            amountIn,
            fee: 3000,
        });

        // 2. prepare the swap
        const txs = await elektrik.swapExactInput(chain.id, fromAddress, {
            tokenIn: params.fromToken,
            tokenOut: params.toToken,
            amountIn: amountIn,
            amountOut: quote.amountOut,
            slippage: params.slippage || 0.05,
            fee: 3000,
        });

        // 3. execute the swap
        const actions: SwapStep[] = [];
        for (const tx of txs) {
            const hash = await walletClient.sendTransaction({
                chain: chain,
                account: walletClient.account,
                kzg: blankKzg(),
                ...tx,
            });
            await publicClient.waitForTransactionReceipt({ hash });
            actions.push({
                txHash: hash,
                description: `Swap:` + tx.description,
            });
        }

        // 4. get the receipt
        const receipt = await publicClient.waitForTransactionReceipt({
            hash: actions[actions.length - 1].txHash as Hex,
        });

        if (!receipt?.status || receipt!.status === "reverted") {
            throw new Error("Transaction failed");
        }

        // 5. return the swap info
        return {
            hash: receipt.transactionHash,
            fromToken: params.fromToken,
            toToken: params.toToken,
            amountIn: amountIn,
            minAmountOut: quote.amountOut,
            recipient: fromAddress,
            steps: actions,
        };
    }
}

export const swapAction = {
    name: "swap",
    description: "Swap tokens on the same chain",
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: unknown,
        callback?: HandlerCallback
    ) => {
        console.log("Swap action handler called");
        const walletProvider = await initWalletProvider(runtime);
        const action = new SwapAction(walletProvider);

        // Compose swap context
        const swapContext = composeContext({
            state,
            template: swapTemplate,
        });
        const content = await generateObjectDeprecated({
            runtime,
            context: swapContext,
            modelClass: ModelClass.LARGE,
        });

        const swapOptions: SwapParams = {
            chain: content.chain,
            fromToken: content.inputToken,
            toToken: content.outputToken,
            amount: content.amount,
            slippage: content.slippage,
        };

        try {
            const swapResp = await action.swap(swapOptions);
            if (callback) {
                callback({
                    text: `Successfully swap ${swapOptions.amount} ${swapOptions.fromToken} tokens to ${swapOptions.toToken}\nTransaction Hash: ${swapResp.hash}`,
                    content: {
                        success: true,
                        hash: swapResp.hash,
                        recipient: swapResp.recipient,
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
    template: swapTemplate,
    validate: async (runtime: IAgentRuntime) => {
        const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
        return typeof privateKey === "string" && privateKey.startsWith("0x");
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Swap 1 ETH for USDC on Lightlink",
                    action: "TOKEN_SWAP",
                },
            },
        ],
    ],
    similes: ["TOKEN_SWAP", "EXCHANGE_TOKENS", "TRADE_TOKENS"],
}; // TODO: add more examples
