const { task } = require("hardhat/config");
const delay = require("../../helpers/helpers");

task("deploy:metacade", "Deploys metacade token").setAction(async (taskArgs, hre) => {
    let tokenContractAddress;
    try {
        await hre.run("clean&compile");
        console.log("Deploying ...");

        const MetacadeTokenFactory = await hre.ethers.getContractFactory("MetacadeToken");
        const MetacadeToken = await MetacadeTokenFactory.deploy();
        await MetacadeToken.deployed();

        console.log("Metacade token has been deployed to " + MetacadeToken.address);
        tokenContractAddress = MetacadeToken.address;
    } catch (error) {
        await hre.run("deploymentError", { error: error, message: error.message, contract: "MetacadeToken" });
        process.exit(1);
    }

    console.log("waiting for 1 min to propagate info to the backend before verification...");
    await delay(60000);

    await hre.run("verification", {
        contract: "MetacadeToken",
        address: tokenContractAddress,
        constructorArguments: Object.values(taskArgs),
    });
});
