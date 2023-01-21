const { task } = require("hardhat/config");
const CONFIG = require("../arguments.deploy.js");
const delay = require("../../helpers/helpers");

task("deploy:CorrectedPresale", "Deploys corrected metacade presale contract").setAction(async (taskArgs, hre) => {
    const { CorrectedPresale: MetacadePresaleArguments } = CONFIG[hre.network.name];

    await hre.run("clean&compile");

    const MetacadePresaleAddress = await hre.run("deployment", {
        network: hre.network.name,
        arguments: MetacadePresaleArguments,
        contract: "MetacadePresale",
    });

    await delay(60000);

    await hre.run("verification", {
        contract: "MetacadePresale",
        address: MetacadePresaleAddress,
        constructorArguments: Object.values(MetacadePresaleArguments),
    });
});
