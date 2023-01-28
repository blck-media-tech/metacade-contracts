const { task } = require("hardhat/config");
const CONFIG = require("../arguments.deploy.js");
const delay = require("../../helpers/helpers");
const contractsData = require("../contractsData.json");
const fs = require("fs");
const path = require("path");

task("deploy:CorrectedPresale", "Deploys corrected metacade presale contract").setAction(async (taskArgs, hre) => {
    let networkContractsData = contractsData[hre.network.name];
    const { CorrectedPresale: MetacadePresaleV2Arguments } = CONFIG[hre.network.name];

    await hre.run("clean&compile");

    const MetacadePresaleV2 = await hre.run("deployment", {
        network: hre.network.name,
        arguments: MetacadePresaleV2Arguments,
        contract: "MetacadePresaleV2",
    });

    networkContractsData.correctedPresale = MetacadePresaleV2.address;

    fs.writeFileSync(path.resolve(__dirname) + "/../contractsData.json", JSON.stringify(contractsData, null, 2));

    await delay(60000);

    await hre.run("verification", {
        contract: "MetacadePresaleV2",
        address: MetacadePresaleV2.address,
        constructorArguments: Object.values(MetacadePresaleV2Arguments),
    });
});
