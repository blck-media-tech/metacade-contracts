const { task } = require("hardhat/config");
const CONFIG = require("../arguments.deploy.js");
const delay = require("../../helpers/helpers");
const fs = require("fs");
const path = require("path");

task("deploy:OriginalPresale", "Deploys original metacade presale contract").setAction(async (taskArgs, hre) => {
    const { MetacadePresale: OriginalPresaleArguments } = CONFIG[hre.network.name];

    await hre.run("clean&compile");

    const MetacadePresaleV1 = await hre.run("deployment", {
        network: hre.network.name,
        arguments: OriginalPresaleArguments,
        contract: "MetacadePresaleV1",
    });

    const contractsData = require("../contractsData.json");
    contractsData[hre.network.name].originalPresale = MetacadePresaleV1.address;
    fs.writeFileSync(path.resolve(__dirname) + "/../contractsData.json", JSON.stringify(contractsData, null, 2));

    await delay(60000);

    await hre.run("verification", {
        contract: "MetacadePresaleV1",
        address: MetacadePresaleV1.address,
        constructorArguments: Object.values(OriginalPresaleArguments),
    });
});
