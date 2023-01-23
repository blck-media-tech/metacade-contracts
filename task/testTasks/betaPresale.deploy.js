const { task } = require("hardhat/config");
const CONFIG = require("../arguments.deploy.js");
const delay = require("../../helpers/helpers");

task("deploy:BetaPresale", "Deploys beta metacade presale contract").setAction(async (taskArgs, hre) => {
    const { MetacadePresale: OriginalPresaleArguments } = CONFIG[hre.network.name];

    await hre.run("clean&compile");
    console.log(OriginalPresaleArguments);
    const OriginalPresale = await hre.run("deployment", {
        network: hre.network.name,
        arguments: OriginalPresaleArguments,
        contract: "MetacadeBeta",
    });

    await delay(60000);

    await hre.run("verification", {
        contract: "MetacadeBeta",
        address: OriginalPresale.address,
        constructorArguments: Object.values(OriginalPresaleArguments),
    });
});
