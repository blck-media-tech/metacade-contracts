const { BigNumber } = require("ethers");
const contractsData = require("./contractsData.json");

const stageAmount = [
    "140000000",
    "297500000",
    "455000000",
    "555000000",
    "655000000",
    "755000000",
    "855000000",
    "955000000",
    "1155000000",
].map(BigNumber.from);

const stagePrice = [
    "8000000000000000",
    "10000000000000000",
    "12000000000000000",
    "13000000000000000",
    "14000000000000000",
    "15500000000000000",
    "17000000000000000",
    "18500000000000000",
    "20000000000000000",
].map(BigNumber.from);

module.exports = {
    testnet: {
        Metacade: {},
        CorrectedPresale: {
            previousPresale: contractsData.testnet.originalPresale,
            betaPresale: contractsData.testnet.betaPresale,
            saleToken: contractsData.testnet.saleToken,
            aggregatorInterface: contractsData.testnet.aggregatorInterface,
            USDTInterface: contractsData.testnet.USDTInterface,
            stageAmount,
            stagePrice,
            startTime: contractsData.testnet.startTime,
            endTime: contractsData.testnet.endTime,
        },
        MetacadePresale: {
            saleToken: "0x5e704556aF0E3ce5c428D49Ab4aD960e597d2e12",
        },
        USDTStub: {
            initialSupply: "5000000000000000",
            name: "Tether USD",
            symbol: "USDT",
            decimals: "6",
        },
    },
    mainnet: {
        CorrectedPresale: {
            previousPresale: contractsData.mainnet.originalPresale,
            betaPresale: contractsData.mainnet.betaPresale,
            saleToken: contractsData.mainnet.saleToken,
            aggregatorInterface: contractsData.mainnet.aggregatorInterface,
            USDTInterface: contractsData.mainnet.USDTInterface,
            stageAmount,
            stagePrice,
            startTime: contractsData.mainnet.startTime,
            endTime: contractsData.mainnet.endTime,
        },
    },
};
