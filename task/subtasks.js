const { subtask } = require("hardhat/config");

subtask("clean&compile", "Cleans artifacts and compiles contracts").setAction(async (taskArgs, hre) => {
    await hre.run("clean");
    await hre.run("compile");
});

subtask("deployment", "Deploys specified contract").setAction(async (taskArgs, hre) => {
    console.log("\n\n⚙️ CONFIGURATION\n------------------------------------");
    console.log(`📡 Selected network: ${taskArgs.network}`);
    console.log(`📡 Contract: ${taskArgs.contract}`);
    console.log(`📡 Passed arguments: ${JSON.stringify(taskArgs.arguments, 2, 4)}`);
    console.log("\n\n🚀 DEPLOYMENT\n------------------------------------");
    console.log(`🚀 Deploying ${taskArgs.contract} contract...`);

    let Contract;

    try {
        Contract = await hre.ethers.getContractFactory(taskArgs.contract);
        Contract = await Contract.deploy(...Object.values(taskArgs.arguments));
        await Contract.deployed();
    } catch (error) {
        await hre.run("deploymentError", { error: error, message: error.message, contract: taskArgs.contract });
        process.exit(1);
    }

    console.log(`\n\n✅ ${taskArgs.contract} deployed to: ${Contract.address}`);
    return Contract.address;
});

subtask("deploymentError", "Notifies about deployment error").setAction(async (taskArgs) => {
    console.log(`\n\n❌ Deployment of ${taskArgs.contract} failed!`);
    console.log(`❌ Message: ${taskArgs.message}`);
});

subtask("verification", "Verifies specified contract").setAction(async (taskArgs, hre) => {
    console.log(`\n\n🔍 Verifying ${taskArgs.contract} contract...`);
    try {
        await hre.run("verify:verify", {
            address: taskArgs.address,
            constructorArguments: taskArgs.constructorArguments,
        });
    } catch (error) {
        console.log(`\n\n❌ Verification of ${taskArgs.contract} failed!`);
        console.log(`❌ Message: ${error.message}`);
        process.exit(1);
    }
});
