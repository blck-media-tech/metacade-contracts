const { task } = require("hardhat/config");
const CONFIG = require("../arguments.deploy.js");

task("deploy:USDTStub", "Deploys stub USDT token").setAction(async (taskArgs, hre) => {
    const { USDTStub: USDTStubArguments } = CONFIG[hre.network.name];

    await hre.run("clean&compile");

    const USDTStub = await hre.run("deployment", {
        network: hre.network.name,
        arguments: USDTStubArguments,
        contract: "USDT",
    });

    await hre.run("verification", {
        contract: "USDT",
        address: USDTStub.address,
        constructorArguments: Object.values(USDTStubArguments),
    });
});
