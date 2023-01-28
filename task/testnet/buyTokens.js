const { task } = require("hardhat/config");
const contractsData = require("../contractsData.json").testnet;

task("test:BuyTokens", "Get contracts data from already deployed contracts")
    .addParam("amount")
    .addParam("contract")
    .setAction(async (taskArgs, hre) => {
        const users = process.env.TEST_USER_PRIVATE_KEYS.split(",").map(
            (el) => new hre.ethers.Wallet(el, hre.ethers.provider)
        );

        const presaleFactory = await hre.ethers.getContractFactory("MetacadePresaleV1");
        const presale = await presaleFactory.attach(contractsData[taskArgs.contract]);

        const USDTFactory = await hre.ethers.getContractFactory("USDT");
        const USDT = await USDTFactory.attach(contractsData.USDTInterface);

        async function buyTokens(signer, amount) {
            let tokenAmount = await presale.connect(signer).usdtBuyHelper(amount * 2);
            await USDT.connect(signer).approve(presale.address, 0);
            await USDT.connect(signer).approve(presale.address, tokenAmount);
            await presale.connect(signer).buyWithUSDT(amount);
        }

        console.log("\n\n⚙️ Purchasing tokens\n------------------------------------");
        console.log(`📡 Selected network: ${hre.network.name}`);

        const amount = taskArgs.amount / users.length;
        const transactions = users.map((user) => {
            return buyTokens(user, amount).then(() => {
                console.log(`Account ${user.address} bought ${amount} tokens`);
            });
        });

        await Promise.all(transactions);
    });
