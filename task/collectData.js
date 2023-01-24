const { task } = require("hardhat/config");
let data = require("./contractsData.json");
const fs = require("fs");
const path = require("path");

task("collectContractsData", "Get contracts data from already deployed contracts").setAction(async (taskArgs, hre) => {
    let networkData = data[hre.network.name];
    console.log("\n\n⚙️ Collecting contracts data\n------------------------------------");
    console.log(`📡 Selected network: ${hre.network.name}`);
    const betaPresaleAddress = networkData.betaPresale;
    const originalPresaleAddress = networkData.originalPresale;
    console.log(`Beta presale address    : ${betaPresaleAddress}`);
    console.log(`Original presale address: ${originalPresaleAddress}`);

    try {
        const betaPresaleFactory = await hre.ethers.getContractFactory("MetacadeBeta");
        const originalPresaleFactory = await hre.ethers.getContractFactory("MetacadeOriginal");
        const betaPresale = await betaPresaleFactory.attach(betaPresaleAddress);
        const originalPresale = await originalPresaleFactory.attach(originalPresaleAddress);

        networkData.saleToken = await betaPresale.saleToken();
        networkData.aggregatorInterface = await betaPresale.aggregatorInterface();
        networkData.USDTInterface = await betaPresale.USDTInterface();
        networkData.startTime = (await originalPresale.startTime()).toString();
        networkData.endTime = (await originalPresale.endTime()).toString();

        fs.writeFileSync(path.resolve(__dirname) + "/contractsData.json", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
    console.log(`Data was wrote in contractsData.json file`);
});
