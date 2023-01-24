const { task } = require("hardhat/config");
const contractsData = require("./contractsData.json");
const fs = require("fs");
const path = require("path");

task("collectContractsData", "Get contracts data from already deployed contracts").setAction(async (taskArgs, hre) => {
    let networkContractsData = contractsData[hre.network.name];
    console.log("\n\n⚙️ Collecting contracts data\n------------------------------------");
    console.log(`📡 Selected network: ${hre.network.name}`);
    const betaPresaleAddress = networkContractsData.betaPresale;
    const originalPresaleAddress = networkContractsData.originalPresale;
    console.log(`Beta presale address    : ${betaPresaleAddress}`);
    console.log(`Original presale address: ${originalPresaleAddress}`);

    try {
        const betaPresaleFactory = await hre.ethers.getContractFactory("MetacadeBeta");
        const originalPresaleFactory = await hre.ethers.getContractFactory("MetacadeOriginal");
        const betaPresale = await betaPresaleFactory.attach(betaPresaleAddress);
        const originalPresale = await originalPresaleFactory.attach(originalPresaleAddress);

        networkContractsData.saleToken = await betaPresale.saleToken();
        networkContractsData.aggregatorInterface = await betaPresale.aggregatorInterface();
        networkContractsData.USDTInterface = await betaPresale.USDTInterface();
        networkContractsData.startTime = (await originalPresale.startTime()).toString();
        networkContractsData.endTime = (await originalPresale.endTime()).toString();

        fs.writeFileSync(path.resolve(__dirname) + "/contractsData.json", JSON.stringify(contractsData, null, 2));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
    console.log(`Data was wrote in contractsData.json file`);
});
