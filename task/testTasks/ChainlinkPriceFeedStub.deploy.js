const { task } = require("hardhat/config");

task("deploy:ChainlinkPriceFeedStub", "Deploys stub ChainlinkPriceFeed contract token").setAction(
    async (taskArgs, hre) => {
        const ChainlinkPriceFeedStubArguments = {};

        await hre.run("clean&compile");

        const ChainlinkPriceFeedStub = await hre.run("deployment", {
            network: hre.network.name,
            arguments: ChainlinkPriceFeedStubArguments,
            contract: "ChainlinkPriceFeedStub",
        });

        await hre.run("verification", {
            contract: "ChainlinkPriceFeedStub",
            address: ChainlinkPriceFeedStub.address,
            constructorArguments: Object.values(ChainlinkPriceFeedStubArguments),
        });
    }
);
