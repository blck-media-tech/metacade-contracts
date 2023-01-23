const { task } = require("hardhat/config");
const CONFIG = require("../arguments.deploy.js");
const delay = require("../../helpers/helpers");

task("deploy:OriginalPresale", "Deploys original metacade presale contract").setAction(async (taskArgs, hre) => {
    const { MetacadePresale: OriginalPresaleArguments } = CONFIG[hre.network.name];

    await hre.run("clean&compile");
    console.log(OriginalPresaleArguments);
    const OriginalPresaleAddress = await hre.run("deployment", {
        network: hre.network.name,
        arguments: OriginalPresaleArguments,
        contract: "MetacadeOriginal",
    });

    await delay(60000);

    await hre.run("verification", {
        contract: "MetacadeOriginal",
        address: OriginalPresaleAddress,
        constructorArguments: Object.values(OriginalPresaleArguments),
    });
});
