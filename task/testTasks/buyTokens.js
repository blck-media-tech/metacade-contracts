const { task } = require("hardhat/config");
let data = require("../contractsData.json").testnet;

task("test:buyTokens", "Get contracts data from already deployed contracts")
    .addParam("amount")
    .addParam("contract")
    .setAction(async (taskArgs, hre) => {
        const users = [
            await hre.ethers.getSigner("0x3EdB98fd1fAB67e32C123E860Ae638F038A4ecF7"),
            await hre.ethers.getSigner("0xe4aedfc70D4B34182E1017B3ec0389aA7Cc9b5FA"),
            await hre.ethers.getSigner("0x179Ffd5b9f9397C445C1A5C969927f20FC8ce220"),
            await hre.ethers.getSigner("0x691ABC1A2Daee99bBeFA717F66eB6a3538af0fFd"),
            await hre.ethers.getSigner("0x5DD39F7bF75063F854D17284AC78805E54132eD9"),
        ];

        const presaleFactory = await hre.ethers.getContractFactory("MetacadeOriginal");
        const presale = await presaleFactory.attach(data[taskArgs.contract]);

        const USDTFactory = await hre.ethers.getContractFactory("USDTStub");
        const USDT = await USDTFactory.attach(data.USDTInterface);

        async function buyTokens(signer, amount) {
            let tokenAmount = await presale.connect(signer).usdtBuyHelper(amount * 2);
            await USDT.connect(signer).approve(presale.address, tokenAmount);
            await presale.connect(signer).buyWithUSDT(amount);
        }

        console.log("\n\n⚙️ Purchasing tokens\n------------------------------------");
        console.log(`📡 Selected network: ${hre.network.name}`);

        const amount = taskArgs.amount / users.length;
        const transactions = users.map((user) => {
            return buyTokens(user, amount)
                .then(() => {
                    console.log(`Account ${user.address} bought ${amount} tokens`);
                })
                .catch((err) => {
                    console.log(`Account ${user.address} error when bought ${amount} tokens: `, err.reason);
                });
        });

        await Promise.all(transactions);
    });
