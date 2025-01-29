import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import {
    composeContext,
    generateObjectDeprecated,
    ModelClass,
} from "@elizaos/core";

import { initWalletProvider, WalletProvider } from "../providers/wallet";
import { swapTemplate } from "../templates";
import type { SwapParams, SwapTransaction } from "../types";
import {
    decodeFunctionResult,
    encodeAbiParameters,
    encodeFunctionData,
    encodePacked,
    parseEther,
    type ChainContract,
    type PublicClient,
} from "viem";
import type { ByteArray, Chain, WalletClient } from "viem";

export { swapTemplate };

export class SwapAction {
    constructor(private walletProvider: WalletProvider) {}

    async swap(params: SwapParams): Promise<SwapTransaction> {
        this.walletProvider.switchChain(params.chain);

        const publicClient = this.walletProvider.getPublicClient(params.chain);
        const walletClient = this.walletProvider.getWalletClient(params.chain);
        const chain = this.walletProvider.getChainConfigs(params.chain);
        const [fromAddress] = await walletClient.getAddresses();
        const uniswapV3Quoter = chain.contracts
            .uniswapV3Quoter as ChainContract;
        const universalRouter = chain.contracts
            .universalRouter as ChainContract;

        // 1. Get the quote
        const quote = await getQuote(
            publicClient as PublicClient,
            uniswapV3Quoter.address,
            params.fromToken,
            params.toToken,
            parseEther(params.amount),
            3000
        );

        // 2. calculate the minimum amount out
        //  `min_amount_out = amount_out - (amount_out * slippage / 100)`
        const slippageBP = BigInt(params.slippage * 10_000);
        const minAmountOut =
            quote.amountOut - (quote.amountOut * slippageBP) / BigInt(100_000);

        // 3. execute the swap
        const tx = await executeSwap(
            chain,
            walletClient,
            universalRouter.address,
            params.fromToken,
            params.toToken,
            parseEther(params.amount),
            minAmountOut,
            3000
        );

        const receipt = await publicClient.waitForTransactionReceipt({
            hash: tx,
        });

        if (!receipt?.status || receipt!.status === "reverted") {
            throw new Error("Transaction failed");
        }

        return {
            hash: tx,
            fromToken: params.fromToken,
            toToken: params.toToken,
            amountIn: parseEther(params.amount),
            minAmountOut: minAmountOut,
            recipient: fromAddress,
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
        _options: any,
        callback?: any
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
                    text: "Swap 1 ETH for USDC on Base",
                    action: "TOKEN_SWAP",
                },
            },
        ],
    ],
    similes: ["TOKEN_SWAP", "EXCHANGE_TOKENS", "TRADE_TOKENS"],
}; // TODO: add more examples

const quoterAbi = [
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "address",
                        name: "tokenIn",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "tokenOut",
                        type: "address",
                    },
                    {
                        internalType: "uint256",
                        name: "amountIn",
                        type: "uint256",
                    },
                    { internalType: "uint24", name: "fee", type: "uint24" },
                    {
                        internalType: "uint160",
                        name: "sqrtPriceLimitX96",
                        type: "uint160",
                    },
                ],
                internalType: "struct IQuoterV2.QuoteExactInputSingleParams",
                name: "params",
                type: "tuple",
            },
        ],
        name: "quoteExactInputSingle",
        outputs: [
            { internalType: "uint256", name: "amountOut", type: "uint256" },
            {
                internalType: "uint160",
                name: "sqrtPriceX96After",
                type: "uint160",
            },
            {
                internalType: "uint32",
                name: "initializedTicksCrossed",
                type: "uint32",
            },
            {
                internalType: "uint256",
                name: "gasEstimate",
                type: "uint256",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
];

const getQuote = async (
    client: PublicClient,
    quoterContractAddress: string,
    fromToken: string,
    toToken: string,
    amountIn: bigint,
    fee: number
) => {
    // Prepare the call
    const encodedData = encodeFunctionData({
        abi: quoterAbi,
        functionName: "quoteExactInputSingle",
        args: [
            {
                tokenIn: fromToken,
                tokenOut: toToken,
                amountIn: amountIn,
                fee: fee,
                sqrtPriceLimitX96: 0n, // no limit
            },
        ],
    });

    // Perform the static call
    const response = await client.call({
        to: quoterContractAddress,
        data: encodedData,
    });

    // Decode the response
    const result = decodeFunctionResult({
        abi: quoterAbi,
        functionName: "quoteExactInputSingle",
        data: response.data,
    });

    // Extract the individual outputs
    const quotedAmountOut = result[0];
    const sqrtPriceX96After = result[1];
    const initializedTicksCrossed = result[2];
    const gasEstimate = result[3];

    return {
        amountOut: quotedAmountOut as bigint,
        sqrtPriceX96After,
        initializedTicksCrossed,
        gasEstimate,
    };
};

const executeSwap = async (
    chain: Chain,
    client: WalletClient,
    universalRouter: `0x${string}`,
    fromToken: `0x${string}`,
    toToken: `0x${string}`,
    amountIn: bigint,
    amountOutMin: bigint,
    fee: number
) => {
    const SWAP_EXACT_IN = "0x00";

    const [fromAddress] = await client.getAddresses();

    // Define the path and input parameters
    const v3SwapRoute = encodePacked(
        ["address", "uint24", "address"],
        [fromToken, fee, toToken]
    );

    const inputs = encodeAbiParameters(
        [
            { type: "address", name: "recipient" },
            { type: "uint256", name: "amountIn" },
            { type: "uint256", name: "amountOutMin" },
            { type: "bytes", name: "path" },
            { type: "bool", name: "payerIsUser" },
        ],
        [fromAddress, amountIn, amountOutMin, v3SwapRoute, true]
    );

    const callData = encodeFunctionData({
        abi: [
            {
                inputs: [
                    { type: "bytes", name: "commands" },
                    { type: "bytes[]", name: "inputs" },
                ],
                name: "execute",
                outputs: [],
                stateMutability: "payable",
                type: "function",
            },
        ],
        functionName: "execute",
        args: [SWAP_EXACT_IN, [inputs]],
    });

    // Send the transaction
    const tx = await client.sendTransaction({
        chain: chain,
        account: fromAddress,
        to: universalRouter,
        data: callData,
        kzg: {
            blobToKzgCommitment: function (_: ByteArray): ByteArray {
                throw new Error("Function not implemented.");
            },
            computeBlobKzgProof: function (
                _blob: ByteArray,
                _commitment: ByteArray
            ): ByteArray {
                throw new Error("Function not implemented.");
            },
        },
    });

    return tx;
};
