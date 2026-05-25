import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import * as dotenv from "dotenv"

dotenv.config({ path: "../../.env.local" })

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? ""
const MANTLE_RPC_TESTNET   = "https://rpc.testnet.mantle.xyz"
const MANTLE_RPC_MAINNET   = "https://rpc.mantle.xyz"

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },

  networks: {
    // Local hardhat node (testing)
    hardhat: {
      chainId: 31337,
    },

    // Mantle Testnet (Sepolia-based, chainId 5003)
    mantleTestnet: {
      url: MANTLE_RPC_TESTNET,
      chainId: 5003,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: "auto",
    },

    // Mantle Mainnet (chainId 5000)
    mantle: {
      url: MANTLE_RPC_MAINNET,
      chainId: 5000,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
  },

  // Mantle explorer for contract verification
  etherscan: {
    apiKey: {
      mantleTestnet: "no-api-key-needed",
      mantle: "no-api-key-needed",
    },
    customChains: [
      {
        network: "mantleTestnet",
        chainId: 5003,
        urls: {
          apiURL: "https://explorer.testnet.mantle.xyz/api",
          browserURL: "https://explorer.testnet.mantle.xyz",
        },
      },
      {
        network: "mantle",
        chainId: 5000,
        urls: {
          apiURL: "https://explorer.mantle.xyz/api",
          browserURL: "https://explorer.mantle.xyz",
        },
      },
    ],
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },

  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
}

export default config
