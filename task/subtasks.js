const { subtask } = require("hardhat/config");

subtask("clean&compile", "Cleans artifacts and compiles contracts").setAction(async (taskArgs, hre) => {
    await hre.run("clean");
    await hre.run("compile");
});

subtask("deploymentError", "Notifies about deployment error").setAction(async (taskArgs) => {
    console.log(`\n\n❌ Deployment of ${taskArgs.contract} failed!`);
    console.log(`❌ Message: ${taskArgs.message}`);
});

subtask("verification", "Verifies specified contract")
    .addParam("address", "token address")
    .setAction(async (taskArgs, hre) => {
        console.log(`\n\n🔍 Verifying contract...`);
        try {
            await hre.run("verify:verify", {
                address: taskArgs.address,
            });
        } catch (error) {
            console.log(`\n\n❌ Verification failed!`);
            console.log(`❌ Message: ${error.message}`);
            process.exit(1);
        }
    });
