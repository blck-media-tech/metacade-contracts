const { task } = require("hardhat/config");
const { USDT_ADDRESS, PRESALE_LENGTH_IN_HOURS } = require("../constants");
const delay = require("../helpers/helpers");

task("deploy:presale", "Deploys upgradeable presale contract of version 1").setAction(async (taskArgs, hre) => {
    let presaleContractAddress;
    const startTimestamp = Date.now();
    const endTimestamp = PRESALE_LENGTH_IN_HOURS * 3600 * 1000 + Date.now();

    try {
        await hre.run("clean&compile");
        console.log("Deploying ...");

        // Mocked aggregator contract deploy
        const MockedOracleFactory = await hre.ethers.getContractFactory("MockAggregator");
        const mockedOracle = await MockedOracleFactory.deploy();
        await mockedOracle.deployed();

        const PresaleFactory = await hre.ethers.getContractFactory("contracts/presale.sol:Presale");
        const presale = await hre.upgrades.deployProxy(
            PresaleFactory,
            [mockedOracle.address, USDT_ADDRESS, startTimestamp, endTimestamp],
            {
                initializer: "initialize",
            }
        );
        await presale.deployed();

        console.log("Presale contract has been deployed to " + presale.address);
        presaleContractAddress = presale.address;
    } catch (error) {
        await hre.run("deploymentError", { error: error, message: error.message, contract: "Presale" });
        process.exit(1);
    }

    if (hre.network.name !== "hardhat") {
        console.log("waiting for 1 min to propagate info to the backend before verification...");
        await delay(60000);

        await hre.run("verification", {
            contract: "Presale",
            address: presaleContractAddress,
            constructorArguments: Object.values(taskArgs),
        });
    }
});
