const { BigNumber } = require("ethers");
const contractsData = require("./contractsData.json");

const stageAmount = [
    "140000000",
    "297500000",
    "455000000",
    "612500000",
    "770000000",
    "927500000",
    "1085000000",
    "1242500000",
    "1400000000",
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
            saleToken: "0x63F8Dc8E6e88691a62E12f82DB3AAdd55f422706",
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
