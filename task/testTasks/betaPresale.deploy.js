const { task } = require("hardhat/config");
const CONFIG = require("../arguments.deploy.js");
const delay = require("../../helpers/helpers");
const contractsData = require("../contractsData.json");
const fs = require("fs");
const path = require("path");
const data = require("../contractsData.json");

task("deploy:BetaPresale", "Deploys beta metacade presale contract").setAction(async (taskArgs, hre) => {
    let networkContractsData = contractsData[hre.network.name];
    const { MetacadePresale: OriginalPresaleArguments } = CONFIG[hre.network.name];

    await hre.run("clean&compile");

    const OriginalPresale = await hre.run("deployment", {
        network: hre.network.name,
        arguments: OriginalPresaleArguments,
        contract: "MetacadeBeta",
    });

    networkContractsData.betaPresale = OriginalPresale.address;

    fs.writeFileSync(path.resolve(__dirname) + "/contractsData.json", JSON.stringify(contractsData, null, 2));

    await delay(60000);

    await hre.run("verification", {
        contract: "MetacadeBeta",
        address: OriginalPresale.address,
        constructorArguments: Object.values(OriginalPresaleArguments),
    });
});
