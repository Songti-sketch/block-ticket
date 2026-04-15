import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    ...(sepoliaRpcUrl
      ? {
          sepolia: {
            type: "http" as const,
            chainType: "l1" as const,
            url: sepoliaRpcUrl,
            accounts: deployerPrivateKey ? [deployerPrivateKey] : [],
          },
        }
      : {}),
  },
});
