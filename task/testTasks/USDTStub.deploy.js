const { task } = require("hardhat/config");
const CONFIG = require("../arguments.deploy.js");

task("deploy:USDTStub", "Deploys stub USDT token").setAction(async (taskArgs, hre) => {
    const { USDTStub: USDTStubArguments } = CONFIG[hre.network.name];

    await hre.run("clean&compile");

    const USDTStub = await hre.run("deployment", {
        network: hre.network.name,
        arguments: USDTStubArguments,
        contract: "USDTStub",
    });

    await hre.run("verification", {
        contract: "USDTStub",
        address: USDTStub.address,
        constructorArguments: Object.values(USDTStubArguments),
    });
});
