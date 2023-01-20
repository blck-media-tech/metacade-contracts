const { task } = require("hardhat/config");
const delay = require("../helpers/helpers");

task("deploy:metacade", "Deploys metacade token").setAction(async (taskArgs, hre) => {
    let tokenContractAddress;
    try {
        await hre.run("clean&compile");
        console.log("Deploying ...");

        const MCADE_token = await hre.ethers.getContractFactory("Metacade");
        const mcade_token = await MCADE_token.deploy();
        await mcade_token.deployed();

        console.log("Metacade token has been deployed to " + mcade_token.address);
        tokenContractAddress = mcade_token.address;
    } catch (error) {
        await hre.run("deploymentError", { error: error, message: error.message, contract: "Metacade" });
        process.exit(1);
    }

    console.log("waiting for 1 min to propagate info to the backend before verification...");
    await delay(60000);

    await hre.run("verification", {
        contract: "Metacade",
        address: tokenContractAddress,
        constructorArguments: Object.values(taskArgs),
    });
});
