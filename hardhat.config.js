require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@openzeppelin/hardhat-upgrades");
require("./task/metacade_token.deploy");
require("./task/presale.deploy");
require("./task/subtasks");
require("./task/CorrectedPresale/correctedPresale.deploy");
require("./task/CorrectedPresale/USDTStub.deploy");
require("./task/CorrectedPresale/ChainlinkPriceFeedStub.deploy");
require("./task/CorrectedPresale/originalPresale.deploy");

/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
    solidity: "0.8.17",
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
        },
        mainnet: {
            accounts: [process.env.DEPLOYER_PRIVATE_KEY],
            url: "https://eth.llamarpc.com",
        },
    },
};
