import { defineChain } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { CONTRACTS } from "./contants";

export const lightlink = defineChain({
    id: 1890,
    name: "Lightlink Phoenix",
    nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
    },
    rpcUrls: {
        default: {
            http: [
                process.env.LIGHTLINK_MAINNET_RPC_URL ||
                    "https://replicator-01.phoenix.lightlink.io/rpc/v1",
            ],
            webSocket: [
                process.env.LIGHTLINK_MAINNET_RPC_URL ||
                    "wss://replicator-01.phoenix.lightlink.io/rpc/v1",
            ],
        },
    },
    blockExplorers: {
        default: { name: "Explorer", url: "https://phoenix.lightlink.io" },
    },
    contracts: {
        uniswapV3Factory: CONTRACTS.lightlink.UNISWAP_V3_FACTORY_ADDRESS,
        universalRouter: CONTRACTS.lightlink.UNIVERSAL_ROUTER,
        uniswapV3Quoter: CONTRACTS.lightlink.UNISWAP_V3_QUOTER_ADDRESS,
    },
});

export const lightlinkTestnet = defineChain({
    id: 1891,
    name: "Lightlink Pegasus Testnet",
    nativeCurrency: {
        decimals: 18,
        name: "Ether",
        symbol: "ETH",
    },
    rpcUrls: {
        default: {
            http: [
                process.env.LIGHTLINK_TESTNET_RPC_URL ||
                    "https://replicator-01.pegasus.lightlink.io/rpc/v1",
            ],
            webSocket: [
                process.env.LIGHTLINK_TESTNET_RPC_URL ||
                    "wss://replicator-01.pegasus.lightlink.io/rpc/v1",
            ],
        },
    },
    blockExplorers: {
        default: { name: "Explorer", url: "https://pegasus.lightlink.io" },
    },
    contracts: {
        uniswapV3Factory: {
            address: CONTRACTS.lightlinkTestnet.UNISWAP_V3_FACTORY_ADDRESS,
        },
        universalRouter: {
            address: CONTRACTS.lightlinkTestnet.UNIVERSAL_ROUTER,
        },
        uniswapV3Quoter: {
            address: CONTRACTS.lightlinkTestnet.UNISWAP_V3_QUOTER_ADDRESS,
        },
    },
});

export const chains = {
    sepolia,
    ethereum: mainnet,
    lightlink: lightlink,
    lightlinkTestnet: lightlinkTestnet,
};
