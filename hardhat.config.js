require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@openzeppelin/hardhat-upgrades");
require("hardhat-abi-exporter");
require("hardhat-gas-reporter");

require("./task/subtasks");
require("./task/collectData");
require("./task/deploy/MetacadeToken.deploy");
require("./task/deploy/MetacadePresale.v2.deploy");
require("./task/testnet/USDTStub.deploy");
require("./task/testnet/MockPriceFeed.deploy");
require("./task/testnet/MetacadePresale.v1.deploy");
require("./task/testnet/MetacadePresale.beta.deploy");
require("./task/testnet/buyTokens");

/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.8.17",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: "0.4.17",
            },
        ],
    },
    mocha: {
        timeout: 10000,
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
    networks: {
        hardhat: {
            accounts: {
                accountsBalance: "100000000000000000000000000",
            },
        },
        testnet: {
            accounts: [process.env.DEPLOYER_PRIVATE_KEY],
            url: `https://endpoints.omniatech.io/v1/eth/goerli/public`,
            gas: 6000000,
        },
        mainnet: {
            accounts: [process.env.DEPLOYER_PRIVATE_KEY],
            url: "https://eth.llamarpc.com",
        },
    },
    gasReporter: {
        enabled: !!process.env.REPORT_GAS,
        noColors: false,
        showTimeSpent: true,
    },
    abiExporter: [
        {
            clear: true,
            path: "./abi/json",
            format: "json",
        },
        {
            clear: true,
            path: "./abi/minimal",
            format: "minimal",
        },
        {
            clear: true,
            path: "./abi/fullName",
            format: "fullName",
        },
    ],
};
