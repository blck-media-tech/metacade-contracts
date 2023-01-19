const hre = require("hardhat");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

async function main() {
    const provider = new hre.ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/");

    const signer = provider.getSigner("0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097");
    const puppet = provider.getSigner("0xFABB0ac9d68B0B445fB7357272Ff202C5651694a");

    const block = await provider.getBlock(provider._lastBlockNumber)

    const TF = await ethers.getContractFactory("Metacade");
    const Token = await TF.connect(signer).deploy();

    const USDTF = await ethers.getContractFactory("USDTStub");
    const USDT = await USDTF.connect(signer).deploy(500000);

    await USDT.connect(signer).mint(signer._address, BigNumber.from(1000000).mul(BigNumber.from(10).pow(18)))
    await USDT.connect(puppet).mint(puppet._address, BigNumber.from(1000000).mul(BigNumber.from(10).pow(18)))

    const orF = await ethers.getContractFactory("ChainlinkPriceFeedStub");
    const oracle = await orF.connect(signer).deploy();

    const prF = await ethers.getContractFactory("MetacadeOriginal");
    const presale = await prF.connect(signer).deploy(Token.address);

    await presale.deployed();

    const startTime = block.timestamp + 60 * 60 * 24
    const endTime = block.timestamp + 60 * 60 * 24 * 2
    await presale
        .connect(signer)
        .initialize(
            oracle.address,
            USDT.address,
            startTime,
            endTime
        );

    async function comparer(comment, exec) {
        let p = await exec(presale);
        let pc = await exec(presaleCorrected);
        console.log(`\n\n===${comment}===`,
            "\nMetacade not corrected: ", p,
            "\nMetacade corrected    : ", pc,
            "\nEqual: ", p.toString()===pc.toString());
    }

    let tokensToBuy = 100000
    let weiToPurchase = await presale.connect(puppet).ethBuyHelper(tokensToBuy);
    await presale.connect(puppet).buyWithEth(tokensToBuy, {value: weiToPurchase});

    tokensToBuy = 157500000-1
    weiToPurchase = await presale.connect(puppet).ethBuyHelper(tokensToBuy);
    await presale.connect(puppet).buyWithEth(tokensToBuy, {value: weiToPurchase});



    await presale.pause();
    //deploy corrected presale
    const PCF = await ethers.getContractFactory("MetacadePresale");
    const presaleCorrected = await PCF.connect(signer).deploy(presale.address);

    console.log("\n\n");

    await presaleCorrected.deployed();

    await comparer("totalTokensSold", (contract) => contract.totalTokensSold())
    await comparer("currentStep", (contract) => contract.currentStep())
    await comparer("startTime", (contract) => contract.startTime())
    await comparer("endTime", (contract) => contract.endTime())
    await comparer("claimStart", (contract) => contract.claimStart())
    await comparer("saleToken", (contract) => contract.saleToken())
    await comparer("baseDecimals", (contract) => contract.baseDecimals())
    await comparer("USDTInterface", (contract) => contract.USDTInterface())
    await comparer("aggregatorInterface", (contract) => contract.aggregatorInterface())
    console.log("\n\n\n");

    await comparer("ethBuyHelper(100)", (contract) => contract.ethBuyHelper(100))
    await comparer("calculatePrice(100)", (contract) => contract.calculatePrice(100))
    await comparer("usdtBuyHelper(100)", (contract) => contract.usdtBuyHelper(100))
    //manipulate with corrected presale

    tokensToBuy = 100000
    weiToPurchase = await presale.connect(puppet).ethBuyHelper(tokensToBuy);
    await presaleCorrected.connect(puppet).buyWithEth(tokensToBuy, {value: weiToPurchase});
    await comparer("totalTokensSold", (contract) => contract.totalTokensSold())
    await comparer("currentStep", (contract) => contract.currentStep())

    tokensToBuy = 100000
    weiToPurchase = await presale.connect(puppet).ethBuyHelper(tokensToBuy);
    await presaleCorrected.connect(puppet).buyWithEth(tokensToBuy, {value: weiToPurchase});

    await comparer("totalTokensSold", (contract) => contract.totalTokensSold())
    await comparer("currentStep", (contract) => contract.currentStep())

    tokensToBuy = 100000
    weiToPurchase = await presale.connect(puppet).ethBuyHelper(tokensToBuy);
    await presaleCorrected.connect(puppet).buyWithEth(tokensToBuy, {value: weiToPurchase});

    await comparer("totalTokensSold", (contract) => contract.totalTokensSold())
    await comparer("currentStep", (contract) => contract.currentStep())

    await comparer("Puppet balance", (contract) => contract.userDeposits(puppet._address))
    await comparer("Puppet claimed", (contract) => contract.hasClaimed(puppet._address))

    const tokensSold = await presaleCorrected.totalTokensSold()
    await Token.connect(signer).increaseAllowance(presaleCorrected.address, tokensSold.mul(BigNumber.from(10).pow(18)));
    await presaleCorrected.connect(signer).startClaim(block.timestamp, tokensSold)

    await comparer("claimStart", (contract) => contract.claimStart())

    await presaleCorrected.connect(puppet).claim();

    await comparer("Puppet balance", (contract) => contract.userDeposits(puppet._address))
    await comparer("Puppet claimed", (contract) => contract.hasClaimed(puppet._address))

    console.log(await Token.balanceOf(puppet._address))
}

hre.run("compile").then(() => {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
});
