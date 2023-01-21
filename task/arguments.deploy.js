const { BigNumber } = require("ethers");
module.exports = {
    testnet: {
        Metacade: {},
        CorrectedPresale: {
            previousPresale: "",
            betaPresale: "0xc7B89Ac70D0600c30B194f01BB716789F36FAD61",
            saleToken: "0x8549Fe48955e86E265311B79A494279dc4a0Eb9a",
            aggregatorInterface: "0x853684B7C69Ff1f58e9c41F82119d7eFf2D86a7C",
            USDTInterface: "0xBCef3C761f76C7c77De20ED393E19e61aa9D7a9a",
            startTime: Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24,
            endTime: Math.floor(new Date().getTime() / 1000) + 60 * 60 * 24 * 2,
            stageAmount: [
                BigNumber.from("140000000"),
                BigNumber.from("297500000"),
                BigNumber.from("455000000"),
                BigNumber.from("612500000"),
                BigNumber.from("770000000"),
                BigNumber.from("927500000"),
                BigNumber.from("1085000000"),
                BigNumber.from("1242500000"),
                BigNumber.from("1400000000"),
            ],
            stagePrice: [
                BigNumber.from("8000000000000000"),
                BigNumber.from("10000000000000000"),
                BigNumber.from("12000000000000000"),
                BigNumber.from("13000000000000000"),
                BigNumber.from("14000000000000000"),
                BigNumber.from("15500000000000000"),
                BigNumber.from("17000000000000000"),
                BigNumber.from("18500000000000000"),
                BigNumber.from("20000000000000000"),
            ],
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
        ASIPresale: {
            saleToken: "",
            oracle: "",
            USDTAddress: "",
            saleStartTime: "",
            saleEndTime: "",
            stageAmount: "",
            stagePrice: "",
        },
    },
};
