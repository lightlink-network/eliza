# @elizaos/plugin-evm

This plugin provides actions and providers for interacting with LightLink networks.

## Description

The EVM plugin provides comprehensive functionality for interacting with EVM-compatible chains, including token transfer.

## Installation

```bash
pnpm install @elizaos/plugin-evm
```

## Configuration

### Required Environment Variables

```env
# Required
EVM_PRIVATE_KEY=your-private-key-here

# Optional - Custom RPC URLs
LIGHTLINK_MAINNET_RPC_URL=https://your-custom-mainnet-rpc-url
LIGHTLINK_TESTNET_RPC_URL=https://your-custom-testnet-rpc-url
```

### Chain Configuration

By default, **LightLink Phoenix (mainnet)** is enabled. To enable additional chains, add them to your character config:

```json
"settings": {
    "chains": {
        "evm": [
            "lightlinkTestnet", "ethereum", "sepolia"
        ]
    }
}
```

## Provider

The **Wallet Provider** initializes with the **first chain in the list** as the default (or Ethereum mainnet if none are added). It:

- Provides the **context** of the currently connected address and its balance.
- Creates **Public** and **Wallet clients** to interact with the supported chains.
- Allows adding chains dynamically at runtime.

## Actions

### 1. Transfer

Transfer native tokens on the same chain:

```typescript
// Example: Transfer 1 ETH
Transfer 1 ETH to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
```

## Development

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Build the plugin:

```bash
pnpm run build
```

4. Run tests:

```bash
pnpm test
```

## API Reference

### Core Components

1. **WalletProvider**

    - Manages wallet connections
    - Handles chain switching
    - Manages RPC endpoints
    - Tracks balances

2. **Actions**
    - TransferAction: Native token transfers

## Contributing

The plugin contains tests. Whether you're using **TDD** or not, please make sure to run the tests before submitting a PR:

```bash
pnpm test
```

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.

## License

This plugin is part of the Eliza project. See the main project repository for license information.
