const { BigNumber } = require("ethers");

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
].map((el) => BigNumber.from(el));

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
].map((el) => BigNumber.from(el));

module.exports = {
    testnet: {
        Metacade: {},
        CorrectedPresale: {
            previousPresale: "0xce0642a3ce521D184307E427f94D71BA79654a1B",
            betaPresale: "0x1d3Ff95E7BcE8e0c610dFA86b4dBAE52c2354FE1",
            saleToken: "0x8549Fe48955e86E265311B79A494279dc4a0Eb9a",
            aggregatorInterface: "0x853684B7C69Ff1f58e9c41F82119d7eFf2D86a7C",
            USDTInterface: "0xBCef3C761f76C7c77De20ED393E19e61aa9D7a9a",
            stageAmount,
            stagePrice,
            startTime: Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24,
            endTime: Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24 * 2,
        },
        MetacadePresale: {
            saleToken: "0x63F8Dc8E6e88691a62E12f82DB3AAdd55f422706",
        },
        USDTStub: {
            initialSupply: "500000",
        },
    },
    mainnet: {
        ASIToken: {
            initialSupply: "",
            cap: "",
        },
        CorrectedPresale: {
            previousPresale: "",
            betaPresale: "",
            saleToken: "",
            aggregatorInterface: "",
            USDTInterface: "",
            stageAmount,
            stagePrice,
            startTime: Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24, //now + day
            endTime: Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24 * 2, //now + 2 days
        },
    },
};
