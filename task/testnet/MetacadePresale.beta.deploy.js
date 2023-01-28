const { task } = require("hardhat/config");
const CONFIG = require("../arguments.deploy.js");
const delay = require("../../helpers/helpers");
const fs = require("fs");
const path = require("path");

task("deploy:BetaPresale", "Deploys beta metacade presale contract").setAction(async (taskArgs, hre) => {
    const { MetacadePresale: OriginalPresaleArguments } = CONFIG[hre.network.name];

    await hre.run("clean&compile");

    const MetacadePresaleBeta = await hre.run("deployment", {
        network: hre.network.name,
        arguments: OriginalPresaleArguments,
        contract: "MetacadePresaleBeta",
    });

    const contractsData = require("../contractsData.json");
    contractsData[hre.network.name].betaPresale = MetacadePresaleBeta.address;
    fs.writeFileSync(path.resolve(__dirname) + "/../contractsData.json", JSON.stringify(contractsData, null, 2));

    await delay(60000);

    await hre.run("verification", {
        contract: "MetacadePresaleBeta",
        address: MetacadePresaleBeta.address,
        constructorArguments: Object.values(OriginalPresaleArguments),
    });
});
