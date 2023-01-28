const { task } = require("hardhat/config");

task("deploy:ChainlinkPriceFeedStub", "Deploys stub ChainlinkPriceFeed contract token").setAction(
    async (taskArgs, hre) => {
        const MockPriceFeedArguments = {};

        await hre.run("clean&compile");

        const MockPriceFeed = await hre.run("deployment", {
            network: hre.network.name,
            arguments: MockPriceFeedArguments,
            contract: "MockPriceFeed",
        });

        await hre.run("verification", {
            contract: "MockPriceFeed",
            address: MockPriceFeed.address,
            constructorArguments: Object.values(MockPriceFeedArguments),
        });
    }
);
