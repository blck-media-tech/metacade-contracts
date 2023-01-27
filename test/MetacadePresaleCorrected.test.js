const { expect } = require("chai");
const hre = require("hardhat");
const { BigNumber, getSigners } = hre.ethers;
const { ZERO_ADDRESS, DAY_IN_SECONDS } = require("./consts");

const stageAmount = [
    "140000000",
    "297500000",
    "455000000",
    "555000000",
    "655000000",
    "755000000",
    "855000000",
    "955000000",
    "1080000000",
].map(BigNumber.from);

const stagePrice = [
    "8000000000000000",
    "10000000000000000",
    "12000000000000000",
    "13000000000000000",
    "14000000000000000",
    "15500000000000000",
    "17000000000000000",
    "18500000000000000",
    "20000000000000000",
].map(BigNumber.from);

const stageMinimumAmount = ["3750", "3000", "2500", "2310", "2150", "1940", "1770", "1625", "1500"].map(BigNumber.from);

describe("MetacadePresale", function () {
    function calculateCurrentStepFixture(totalSoldAmount) {
        if (totalSoldAmount < stageAmount[0]) return 0;
        for (let i = 1; i < stageAmount.length; i++) {
            if (totalSoldAmount < stageAmount[i]) return i;
        }
    }

    async function deployTokenFixture(creator) {
        const tokenFactory = await hre.ethers.getContractFactory("MetacadeToken");
        return await tokenFactory.connect(creator).deploy();
    }

    async function deployUSDTStubFixture(creator) {
        const USDTFactory = await hre.ethers.getContractFactory("USDT");
        return await USDTFactory.connect(creator).deploy(1000000000000000, "Tether USD", "USDT", 6);
    }

    async function deployChainlinkPriceFeedStubFixture(creator) {
        const ChainlinkPriceFeedFactory = await hre.ethers.getContractFactory("MockPriceFeed");
        return await ChainlinkPriceFeedFactory.connect(creator).deploy();
    }

    async function deployOriginalPresaleFixture() {
        //setup values
        const block = await hre.ethers.provider.getBlock("latest");
        const saleStartTime = block.timestamp + DAY_IN_SECONDS;
        const saleEndTime = saleStartTime + DAY_IN_SECONDS;

        const [creator, presaleOwner, Alice] = await getSigners();

        //Deploy necessary contracts
        const token = await deployTokenFixture(creator);
        const USDT = await deployUSDTStubFixture(creator);
        const ChainlinkPriceFeed = await deployChainlinkPriceFeedStubFixture(creator);

        //Deploy presale contract
        const presaleFactory = await hre.ethers.getContractFactory("MetacadePresaleV1");
        const presale = await presaleFactory.connect(creator).deploy(token.address);

        await presale.connect(creator).initialize(ChainlinkPriceFeed.address, USDT.address, saleStartTime, saleEndTime);

        //Transfer presale contract ownership to specified address
        await presale.transferOwnership(presaleOwner.address);

        return {
            USDT,
            token,
            originalPresale: presale,
            saleStartTime,
            saleEndTime,
            ChainlinkPriceFeed,
            users: {
                creator,
                presaleOwner,
                Alice,
            },
        };
    }

    async function deployBetaPresaleFixture(token, ChainlinkPriceFeed, USDT, creator, presaleOwner) {
        //setup values
        const block = await hre.ethers.provider.getBlock("latest");
        const saleStartTime = block.timestamp + DAY_IN_SECONDS;
        const saleEndTime = saleStartTime + DAY_IN_SECONDS;

        //Deploy presale contract
        const presaleFactory = await hre.ethers.getContractFactory("MetacadePresaleV1");
        const presale = await presaleFactory.connect(creator).deploy(token.address);

        await presale.connect(creator).initialize(ChainlinkPriceFeed.address, USDT.address, saleStartTime, saleEndTime);

        //Transfer presale contract ownership to specified address
        await presale.transferOwnership(presaleOwner.address);

        await setOriginalPresaleToCurrentCondition(presale, USDT, creator);

        return presale;
    }

    async function setOriginalPresaleToCurrentCondition(originalPresale, usdt, creator) {
        const tokensToPurchase = 100000000;
        const ethPrice = await originalPresale.ethBuyHelper(tokensToPurchase);
        await originalPresale.buyWithEth(tokensToPurchase, { value: ethPrice });

        const allowance = await originalPresale.usdtBuyHelper(tokensToPurchase);
        await usdt.connect(creator).approve(originalPresale.address, allowance);
        await originalPresale.connect(creator).buyWithUSDT(tokensToPurchase);
    }

    async function deployCorrectedPresaleFixture(
        originalPresale,
        betaPresale,
        saleToken,
        ChainlinkPriceFeed,
        USDT,
        creator,
        presaleOwner
    ) {
        const startTime = await originalPresale.startTime();
        const endTime = await originalPresale.endTime();

        //Deploy presale contract
        const presaleCorrectedFactory = await hre.ethers.getContractFactory("MetacadePresaleV2");
        const presaleCorrected = await presaleCorrectedFactory
            .connect(creator)
            .deploy(
                originalPresale.address,
                betaPresale.address,
                saleToken.address,
                ChainlinkPriceFeed.address,
                USDT.address,
                stageAmount,
                stagePrice,
                stageMinimumAmount,
                startTime,
                endTime
            );

        await presaleCorrected.connect(creator).sync();

        //Transfer presale contract ownership to specified address
        await presaleCorrected.transferOwnership(presaleOwner.address);

        return presaleCorrected;
    }

    async function purchaseTokensFixture(contract, signer, amount) {
        const priceInWei = await contract.connect(signer).ethBuyHelper(amount);
        await contract.connect(signer).buyWithEth(amount, { value: priceInWei });
    }

    async function timeTravelFixture(targetTime) {
        await hre.network.provider.send("evm_setNextBlockTimestamp", [targetTime]);
    }

    async function startClaimFixture(presale, token, creator, presaleOwner, claimStartTime) {
        const tokensAmount = await presale.totalTokensSold();
        const valueToTransfer = BigNumber.from(tokensAmount).mul(BigNumber.from(10).pow(await token.decimals()));
        await token.connect(creator).transfer(presale.address, valueToTransfer);
        await presale.connect(presaleOwner).configureClaim(claimStartTime);
    }

    it("should be correctly deployed", async function () {
        const { originalPresale, USDT, token, ChainlinkPriceFeed, saleEndTime, saleStartTime, users } =
            await deployOriginalPresaleFixture();

        const betaPresale = await deployBetaPresaleFixture(
            token,
            ChainlinkPriceFeed,
            USDT,
            users.creator,
            users.presaleOwner
        );

        const presaleCorrectedFactory = await hre.ethers.getContractFactory("MetacadePresaleV2");
        const presaleCorrected = await presaleCorrectedFactory
            .connect(users.creator)
            .deploy(
                originalPresale.address,
                betaPresale.address,
                token.address,
                ChainlinkPriceFeed.address,
                USDT.address,
                stageAmount,
                stagePrice,
                stageMinimumAmount,
                saleStartTime,
                saleEndTime
            );

        expect(presaleCorrected.address).not.to.equal(ZERO_ADDRESS);
    });

    it("should have similar values with original contract after deployment", async function () {
        const { originalPresale, USDT, token, ChainlinkPriceFeed, saleEndTime, saleStartTime, users } =
            await deployOriginalPresaleFixture();

        const betaPresale = await deployBetaPresaleFixture(
            token,
            ChainlinkPriceFeed,
            USDT,
            users.creator,
            users.presaleOwner
        );

        const presaleCorrectedFactory = await hre.ethers.getContractFactory("MetacadePresaleV2");
        const presaleCorrected = await presaleCorrectedFactory
            .connect(users.creator)
            .deploy(
                originalPresale.address,
                betaPresale.address,
                token.address,
                ChainlinkPriceFeed.address,
                USDT.address,
                stageAmount,
                stagePrice,
                stageMinimumAmount,
                saleStartTime,
                saleEndTime
            );

        await presaleCorrected.connect(users.creator).sync();

        expect(presaleCorrected.address).not.to.equal(ZERO_ADDRESS);
        expect(originalPresale.address).not.to.equal(ZERO_ADDRESS);
        expect(betaPresale.address).not.to.equal(ZERO_ADDRESS);

        const startTime = await originalPresale.startTime();
        const startTimeCorrected = await presaleCorrected.startTime();
        expect(startTime).to.equal(startTimeCorrected);

        const endTime = await originalPresale.endTime();
        const endTimeCorrected = await presaleCorrected.endTime();
        expect(endTime).to.equal(endTimeCorrected);

        const claimStart = await originalPresale.claimStart();
        const claimStartCorrected = await presaleCorrected.claimStart();
        expect(claimStart).to.equal(claimStartCorrected);

        const saleToken = await originalPresale.saleToken();
        const saleTokenCorrected = await presaleCorrected.saleToken();
        expect(saleToken).to.equal(saleTokenCorrected);

        const USDTInterface = await originalPresale.USDTInterface();
        const USDTInterfaceCorrected = await presaleCorrected.USDTInterface();
        expect(USDTInterface).to.equal(USDTInterfaceCorrected);

        const aggregatorInterface = await originalPresale.aggregatorInterface();
        const aggregatorInterfaceCorrected = await presaleCorrected.aggregatorInterface();
        expect(aggregatorInterface).to.equal(aggregatorInterfaceCorrected);
    });

    it("should be reverted if oracle address is zero address", async function () {
        const { originalPresale, USDT, token, ChainlinkPriceFeed, saleEndTime, saleStartTime, users } =
            await deployOriginalPresaleFixture();

        const betaPresale = await deployBetaPresaleFixture(
            token,
            ChainlinkPriceFeed,
            USDT,
            users.creator,
            users.presaleOwner
        );

        const presaleCorrectedFactory = await hre.ethers.getContractFactory("MetacadePresaleV2");
        const presaleCorrectedTx = presaleCorrectedFactory
            .connect(users.creator)
            .deploy(
                originalPresale.address,
                betaPresale.address,
                token.address,
                ZERO_ADDRESS,
                USDT.address,
                stageAmount,
                stagePrice,
                stageMinimumAmount,
                saleStartTime,
                saleEndTime
            );

        //Assert was reverted
        await expect(presaleCorrectedTx).to.be.rejectedWith("Zero aggregator address");
    });

    it("should be reverted if USDT address is zero address", async function () {
        const { originalPresale, USDT, token, ChainlinkPriceFeed, saleEndTime, saleStartTime, users } =
            await deployOriginalPresaleFixture();

        const betaPresale = await deployBetaPresaleFixture(
            token,
            ChainlinkPriceFeed,
            USDT,
            users.creator,
            users.presaleOwner
        );

        const presaleCorrectedFactory = await hre.ethers.getContractFactory("MetacadePresaleV2");
        const presaleCorrectedTx = presaleCorrectedFactory
            .connect(users.creator)
            .deploy(
                originalPresale.address,
                betaPresale.address,
                token.address,
                ChainlinkPriceFeed.address,
                ZERO_ADDRESS,
                stageAmount,
                stagePrice,
                stageMinimumAmount,
                saleStartTime,
                saleEndTime
            );

        //Assert was reverted
        await expect(presaleCorrectedTx).to.be.rejectedWith("Zero USDT address");
    });

    it("should be reverted if sale token address is zero address", async function () {
        const { originalPresale, USDT, token, ChainlinkPriceFeed, saleEndTime, saleStartTime, users } =
            await deployOriginalPresaleFixture();

        const betaPresale = await deployBetaPresaleFixture(
            token,
            ChainlinkPriceFeed,
            USDT,
            users.creator,
            users.presaleOwner
        );

        const presaleCorrectedFactory = await hre.ethers.getContractFactory("MetacadePresaleV2");
        const presaleCorrectedTx = presaleCorrectedFactory
            .connect(users.creator)
            .deploy(
                originalPresale.address,
                betaPresale.address,
                token.address,
                ChainlinkPriceFeed.address,
                ZERO_ADDRESS,
                stageAmount,
                stagePrice,
                stageMinimumAmount,
                saleStartTime,
                saleEndTime
            );

        //Assert was reverted
        await expect(presaleCorrectedTx).to.be.rejectedWith("Zero sale token address");
    });

    it("should be reverted if saleEndTime less than saleStartTime", async function () {
        const { originalPresale, USDT, token, ChainlinkPriceFeed, saleEndTime, saleStartTime, users } =
            await deployOriginalPresaleFixture();

        const betaPresale = await deployBetaPresaleFixture(
            token,
            ChainlinkPriceFeed,
            USDT,
            users.creator,
            users.presaleOwner
        );

        const presaleCorrectedFactory = await hre.ethers.getContractFactory("MetacadePresaleV2");
        const presaleCorrectedTx = presaleCorrectedFactory
            .connect(users.creator)
            .deploy(
                originalPresale.address,
                betaPresale.address,
                token.address,
                ChainlinkPriceFeed.address,
                ZERO_ADDRESS,
                stageAmount,
                stagePrice,
                stageMinimumAmount,
                saleStartTime,
                saleEndTime
            );

        //Assert was reverted
        await expect(presaleCorrectedTx).to.be.rejectedWith("Invalid time");
    });

    describe("Presale functions", function () {
        async function deployContractsFixture() {
            const { originalPresale, USDT, token, ChainlinkPriceFeed, users, saleEndTime, saleStartTime } =
                await deployOriginalPresaleFixture();

            const betaPresale = await deployBetaPresaleFixture(
                token,
                ChainlinkPriceFeed,
                USDT,
                users.creator,
                users.presaleOwner
            );

            const correctedPresale = await deployCorrectedPresaleFixture(
                originalPresale,
                betaPresale,
                token,
                ChainlinkPriceFeed,
                USDT,
                users.creator,
                users.presaleOwner
            );

            return {
                originalPresale,
                betaPresale,
                correctedPresale,
                USDT,
                token,
                ChainlinkPriceFeed,
                saleEndTime,
                saleStartTime,
                users,
            };
        }

        describe("'sync' function", function () {
            it("should correctly set totalTokenSold", async function () {
                const { originalPresale, USDT, token, ChainlinkPriceFeed, saleEndTime, saleStartTime, users } =
                    await deployOriginalPresaleFixture();

                const betaPresale = await deployBetaPresaleFixture(
                    token,
                    ChainlinkPriceFeed,
                    USDT,
                    users.creator,
                    users.presaleOwner
                );

                const presaleCorrectedFactory = await hre.ethers.getContractFactory("MetacadePresaleV2");
                const presaleCorrected = await presaleCorrectedFactory
                    .connect(users.creator)
                    .deploy(
                        originalPresale.address,
                        betaPresale.address,
                        token.address,
                        ChainlinkPriceFeed.address,
                        USDT.address,
                        stageAmount,
                        stagePrice,
                        stageMinimumAmount,
                        saleStartTime,
                        saleEndTime
                    );

                await presaleCorrected.connect(users.creator).sync();

                const totalTokensSold = await originalPresale.totalTokensSold();
                const totalTokensSoldBeta = await betaPresale.totalTokensSold();
                const totalTokensSoldCorrected = await presaleCorrected.totalTokensSold();
                expect(totalTokensSoldCorrected).to.equal(totalTokensSold.add(totalTokensSoldBeta));

                const currentStep = await calculateCurrentStepFixture(totalTokensSoldCorrected);
                const currentStepCorrected = await presaleCorrected.currentStep();
                expect(currentStep).to.equal(currentStepCorrected);
            });

            it("should revert if called not by the owner", async function () {
                const { originalPresale, USDT, token, ChainlinkPriceFeed, saleEndTime, saleStartTime, users } =
                    await deployOriginalPresaleFixture();

                const betaPresale = await deployBetaPresaleFixture(
                    token,
                    ChainlinkPriceFeed,
                    USDT,
                    users.creator,
                    users.presaleOwner
                );

                const presaleCorrectedFactory = await hre.ethers.getContractFactory("MetacadePresaleV2");
                const presaleCorrected = await presaleCorrectedFactory.deploy(
                    originalPresale.address,
                    betaPresale.address,
                    token.address,
                    ChainlinkPriceFeed.address,
                    USDT.address,
                    stageAmount,
                    stagePrice,
                    stageMinimumAmount,
                    saleStartTime,
                    saleEndTime
                );

                const syncTx = presaleCorrected.connect(users.presaleOwner).sync();

                await expect(syncTx).to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("should revert if contract already synced", async function () {
                const { originalPresale, USDT, token, ChainlinkPriceFeed, saleEndTime, saleStartTime, users } =
                    await deployOriginalPresaleFixture();

                const betaPresale = await deployBetaPresaleFixture(
                    token,
                    ChainlinkPriceFeed,
                    USDT,
                    users.creator,
                    users.presaleOwner
                );

                const presaleCorrectedFactory = await hre.ethers.getContractFactory("MetacadePresaleV2");
                const presaleCorrected = await presaleCorrectedFactory.deploy(
                    originalPresale.address,
                    betaPresale.address,
                    token.address,
                    ChainlinkPriceFeed.address,
                    USDT.address,
                    stageAmount,
                    stagePrice,
                    stageMinimumAmount,
                    saleStartTime,
                    saleEndTime
                );

                await presaleCorrected.sync();

                const syncTx = presaleCorrected.sync();

                await expect(syncTx).to.be.revertedWith("Already synchronized");
            });
        });

        describe("'pause' function", function () {
            it("should pause contract if called by the owner", async function () {
                const { correctedPresale: presale, users } = await deployContractsFixture();

                //Get paused status before transaction
                const pauseStatusBefore = await presale.paused();

                //Pause contract
                const pauseTx = presale.connect(users.presaleOwner).pause();

                //Assert transaction was successful
                await expect(pauseTx).not.to.be.reverted;

                //Get paused status after transaction
                const pauseStatusAfter = await presale.paused();

                //Assert transaction results
                expect(pauseStatusBefore).to.equal(false);
                expect(pauseStatusAfter).to.equal(true);
            });

            it("should revert if called not by the owner", async function () {
                const { correctedPresale: presale } = await deployContractsFixture();

                //Pause contract
                const pauseTx = presale.pause();

                //Assert transaction is reverted
                await expect(pauseTx).to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("should revert if contract already paused", async function () {
                const { correctedPresale: presale, users } = await deployContractsFixture();

                //Preliminarily pause contract
                await presale.connect(users.presaleOwner).pause();

                //Pause contract
                const pauseTx = presale.connect(users.presaleOwner).pause();

                //Assert transaction is reverted
                await expect(pauseTx).to.be.revertedWith("Pausable: paused");
            });
        });

        describe("'unpause' function", function () {
            it("should unpause contract if called by the owner", async function () {
                const { correctedPresale: presale, users } = await deployContractsFixture();

                //Preliminarily pause contract
                await presale.connect(users.presaleOwner).pause();

                //Get paused status before transaction
                const pauseStatusBefore = await presale.paused();

                //Unpause contract
                const pauseTx = presale.connect(users.presaleOwner).unpause();

                //Assert transaction was successful
                await expect(pauseTx).not.to.be.reverted;

                //Get paused status after transaction
                const pauseStatusAfter = await presale.paused();

                //Assert transaction results
                expect(pauseStatusBefore).to.equal(true);
                expect(pauseStatusAfter).to.equal(false);
            });

            it("should revert if called not by the owner", async function () {
                const { correctedPresale: presale } = await deployContractsFixture();

                //Pause contract
                const pauseTx = presale.unpause();

                //Assert transaction is reverted
                await expect(pauseTx).to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("should revert if contract already unpaused", async function () {
                const { correctedPresale: presale, users } = await deployContractsFixture();

                //Unpause contract
                const unpauseTx = presale.connect(users.presaleOwner).unpause();

                //Assert transaction is reverted
                await expect(unpauseTx).to.be.revertedWith("Pausable: not paused");
            });
        });

        describe("'changeSaleTimes' function", function () {
            it("should set sale start time and sale end time", async function () {
                const { correctedPresale: presale, users } = await deployContractsFixture();

                const saleTimeModifier = DAY_IN_SECONDS;

                //Get sale time before transaction
                const saleStartTimeBefore = await presale.startTime();
                const saleEndTimeBefore = await presale.endTime();

                //Change sale start time
                const changeSaleStartTimeTx = presale
                    .connect(users.presaleOwner)
                    .changeSaleTimes(
                        saleStartTimeBefore.add(saleTimeModifier),
                        saleEndTimeBefore.add(saleTimeModifier)
                    );

                //Assert transaction was successful
                await expect(changeSaleStartTimeTx).not.to.be.reverted;

                //Get sale time after transaction
                const saleStartTimeAfter = await presale.startTime();
                const saleEndTimeAfter = await presale.endTime();

                //Assert sale start time after transaction with expected
                expect(saleStartTimeAfter).to.equal(saleStartTimeBefore.add(saleTimeModifier));
                expect(saleEndTimeAfter).to.equal(saleEndTimeBefore.add(saleTimeModifier));
            });

            it("should revert if called not by the owner", async function () {
                //Set values
                const { correctedPresale: presale } = await deployContractsFixture();

                //Change sale start time
                const changeSaleStartTimeTx = presale.changeSaleTimes(0, 0);

                //Assert transaction is reverted
                await expect(changeSaleStartTimeTx).to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("should emit SaleStartTimeUpdated event", async function () {
                //Set values
                const { correctedPresale: presale, users } = await deployContractsFixture();

                const saleTimeModifier = DAY_IN_SECONDS;

                //Get sale time before transaction
                const saleStartTimeBefore = await presale.startTime();
                const saleEndTimeBefore = await presale.endTime();

                //Change sale start time
                const changeSaleStartTimeTx = presale
                    .connect(users.presaleOwner)
                    .changeSaleTimes(
                        saleStartTimeBefore.add(saleTimeModifier),
                        saleEndTimeBefore.add(saleTimeModifier)
                    );

                //Assert transaction was successful
                await expect(changeSaleStartTimeTx).not.to.be.reverted;

                //Assert SaleStartTimeUpdated event was emitted
                expect(changeSaleStartTimeTx)
                    .to.emit(presale, "SaleStartTimeUpdated")
                    .withArgs(saleStartTimeBefore.add(saleTimeModifier));
            });
        });

        describe("'configureClaim' function", function () {
            it("should set claim start time", async function () {
                const { correctedPresale: presale, users, token, saleEndTime } = await deployContractsFixture();
                const tokensAmount = await presale.totalTokensSold();

                //Get claim start time before transaction
                const claimStartTimeBefore = await presale.claimStart();

                //Transfer tokens to presale contract
                await token
                    .connect(users.creator)
                    .transfer(
                        presale.address,
                        BigNumber.from(tokensAmount).mul(BigNumber.from(10).pow(await token.decimals()))
                    );

                //Start claim
                const configureClaimTx = presale
                    .connect(users.presaleOwner)
                    .configureClaim(saleEndTime + DAY_IN_SECONDS);

                //Assert transaction was successful
                await expect(configureClaimTx).not.to.be.reverted;

                //Get sales start time after transaction
                const claimStartTimeAfter = await presale.claimStart();

                //Assert claim start time after transaction with expected
                expect(claimStartTimeBefore).to.equal(0);
                expect(claimStartTimeAfter).to.equal(saleEndTime + DAY_IN_SECONDS);
            });

            it("should revert if called not by the owner", async function () {
                //Set values
                const { correctedPresale: presale, users, token } = await deployContractsFixture();
                const tokensAmount = await presale.totalTokensSold();

                //Transfer tokens to presale contract
                await token.connect(users.creator).transfer(presale.address, tokensAmount);

                //Change claim start time
                const configureClaimTx = presale.configureClaim(0);

                //Assert transaction is reverted
                await expect(configureClaimTx).to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("should revert if transferred not enough tokens", async function () {
                //Set values
                const { correctedPresale: presale, users, token, saleEndTime } = await deployContractsFixture();
                const tokensAmount = await presale.totalTokensSold();

                //Transfer tokens to presale contract
                await token.connect(users.creator).transfer(presale.address, tokensAmount / 2);

                //Start claim
                const configureClaimTx = presale
                    .connect(users.presaleOwner)
                    .configureClaim(saleEndTime + DAY_IN_SECONDS);

                //Assert transaction was reverted
                await expect(configureClaimTx).to.be.revertedWith("Not enough balance");
            });

            it("should emit SaleStartTimeUpdated event", async function () {
                //Set values
                const { correctedPresale: presale, users, token, saleEndTime } = await deployContractsFixture();
                const tokensAmount = await presale.totalTokensSold();

                const claimStartTimeModifier = DAY_IN_SECONDS;

                //Get claim start time before transaction
                const claimStartTimeBefore = await presale.claimStart();

                //Transfer tokens to presale contract
                await token
                    .connect(users.creator)
                    .transfer(
                        presale.address,
                        BigNumber.from(tokensAmount).mul(BigNumber.from(10).pow(await token.decimals()))
                    );

                //Claim start time
                const claimStartTimeTx = presale
                    .connect(users.presaleOwner)
                    .configureClaim(saleEndTime + DAY_IN_SECONDS);

                //Assert transaction was successful
                await expect(claimStartTimeTx).not.to.be.reverted;

                //Assert SaleEndTimeUpdated event was emitted
                expect(claimStartTimeTx)
                    .to.emit(presale, "ClaimStartTimeUpdated")
                    .withArgs(claimStartTimeBefore.add(claimStartTimeModifier));
            });
        });

        describe("'getCurrentPrice' function", function () {
            it("should return stage price for current stage", async function () {
                //Set values
                const { correctedPresale: presale } = await deployContractsFixture();

                //Get current stage
                const stage = await presale.currentStep();

                //Get current stage price
                const getCurrentPriceTx = presale.getCurrentPrice();

                //Assert transaction was successful
                await expect(getCurrentPriceTx).not.to.be.reverted;

                //Assert current stage price with expected
                expect(await getCurrentPriceTx).to.equal(stagePrice[stage]);
            });
        });

        describe("'getTotalPresaleAmount' function", function () {
            it("should return total presale limit", async function () {
                //Set values
                const { correctedPresale: presale } = await deployContractsFixture();

                //Get total presale amount
                const getTotalPresaleAmountTx = presale.getTotalPresaleAmount();

                //Assert transaction was successful
                await expect(getTotalPresaleAmountTx).not.to.be.reverted;

                //Assert total presale amount with expected
                expect(await getTotalPresaleAmountTx).to.equal(stageAmount[stageAmount.length - 1]);
            });
        });

        // describe("'totalSoldPrice' function", function () {
        //     it("should return total cost of sold tokens", async function () {
        //         //Set values
        //         const { correctedPresale: presale, users, saleStartTime } = await deployContractsFixture();
        //         const tokensToPurchase = 1000;
        //
        //         //Timeshift to sale period
        //         await timeTravelFixture(saleStartTime + 1);
        //
        //         //Purchase some tokens
        //         await purchaseTokensFixture(presale, users.creator, tokensToPurchase);
        //
        //         //Get total token sold amount
        //         const tokensSold = await presale.totalTokensSold();
        //
        //         //Calculate expected price
        //         let price = BigNumber.from(0);
        //         let tokensCalculated = 0;
        //         for (let i = 0; tokensSold <= stageAmount[i]; i++) {
        //             const tokensForStage = Math.min(tokensSold, stageAmount[i]) - tokensCalculated;
        //             price = price.add(stagePrice[i].mul(tokensForStage));
        //             tokensCalculated += tokensForStage;
        //         }
        //
        //         //Get total sold price
        //         const totalSoldPriceTx = presale.totalSoldPrice();
        //
        //         //Assert transaction was successful
        //         await expect(totalSoldPriceTx).not.to.be.reverted;
        //
        //         //Assert total sold price with expected
        //         expect(await totalSoldPriceTx).to.equal(price);
        //     });
        // });

        describe("'buyWithEth' function", function () {
            it("should increase purchased tokens amount and transfer payment to owner", async function () {
                //Set values
                const { correctedPresale: presale, saleStartTime, token, users } = await deployContractsFixture();
                const tokensToPurchase = 10000;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Get wei price
                const weiPrice = await presale.ethBuyHelper(tokensToPurchase);

                //Get values before transaction
                const purchaseTokensAmountBefore = await presale.userDeposits(users.creator.address);
                const ETHAmountBefore = await hre.ethers.provider.getBalance(users.presaleOwner.address);

                //Buy with eth
                const buyWithEthTx = presale.connect(users.creator).buyWithEth(tokensToPurchase, { value: weiPrice });

                //Assert transaction was successful
                await expect(buyWithEthTx).not.to.be.reverted;

                //Get values after transaction
                const purchaseTokensAmountAfter = await presale.userDeposits(users.creator.address);
                const ETHAmountAfter = await hre.ethers.provider.getBalance(users.presaleOwner.address);
                const decimals = await token.decimals();

                //Assert values with expected
                expect(purchaseTokensAmountAfter).to.equal(
                    purchaseTokensAmountBefore.add(BigNumber.from(10).pow(decimals).mul(tokensToPurchase))
                );
                expect(ETHAmountAfter).to.equal(ETHAmountBefore.add(weiPrice));
            });

            it("should revert if user blacklisted", async function () {
                //Set values
                const { correctedPresale: presale, saleStartTime, users } = await deployContractsFixture();
                const tokensToPurchase = 10000;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Blacklist user
                await presale.connect(users.presaleOwner).addToBlacklist([users.creator.address]);

                //Get wei price
                const weiPrice = await presale.ethBuyHelper(tokensToPurchase);

                //Buy with eth
                const buyWithEthTx = presale.connect(users.creator).buyWithEth(tokensToPurchase, { value: weiPrice });

                //Assert transaction was successful
                await expect(buyWithEthTx).to.be.revertedWith("You are in blacklist");
            });

            it("should revert if trying to buy before sales start", async function () {
                //Set values
                const { correctedPresale: presale, users } = await deployContractsFixture();
                const tokensToPurchase = 10000;

                //Get wei price
                const weiPrice = await presale.ethBuyHelper(tokensToPurchase);

                //Buy with eth
                const buyWithEthTx = presale.connect(users.creator).buyWithEth(tokensToPurchase, { value: weiPrice });

                //Assert transaction was reverted
                await expect(buyWithEthTx).to.be.revertedWith("Invalid time for buying");
            });

            it("should revert if not enough value", async function () {
                //Set values
                const { correctedPresale: presale, saleStartTime, users } = await deployContractsFixture();
                const tokensToPurchase = 10000;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Get wei price
                const weiPrice = await presale.ethBuyHelper(tokensToPurchase);

                //Buy with eth
                const buyWithEthTx = presale
                    .connect(users.creator)
                    .buyWithEth(tokensToPurchase, { value: weiPrice.sub(1) });

                //Assert transaction was reverted
                await expect(buyWithEthTx).to.be.revertedWith("Less payment");
            });

            it("should revert if try to buy more tokens than presale limit", async function () {
                //Set values
                const { correctedPresale: presale, saleStartTime, users } = await deployContractsFixture();
                const tokensToPurchase = stageAmount[stageAmount.length - 1] - (await presale.totalTokensSold());

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Get wei price
                const weiPrice = await presale.ethBuyHelper(tokensToPurchase);

                //Buy with eth
                const buyWithEthTx = presale
                    .connect(users.creator)
                    .buyWithEth(tokensToPurchase + 1, { value: weiPrice });

                //Assert transaction was reverted
                await expect(buyWithEthTx).to.be.revertedWith("Insufficient funds");
            });

            it("should revert if try to buy less than minimal stage amount", async function () {
                //Set values
                const { correctedPresale: presale, saleStartTime, users } = await deployContractsFixture();
                const tokensToPurchase = stageAmount[stageAmount.length - 1] - (await presale.totalTokensSold());

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Get wei price
                const weiPrice = await presale.ethBuyHelper(tokensToPurchase);

                //Buy with eth
                const buyWithEthTx = presale.connect(users.creator).buyWithEth(1, { value: weiPrice });

                //Assert transaction was reverted
                await expect(buyWithEthTx).to.be.revertedWith("Less than step minimum");
            });

            it("should emit TokensBought event", async function () {
                //Set values
                const { correctedPresale: presale, saleStartTime, users } = await deployContractsFixture();
                const tokensToPurchase = 10000;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Get wei price
                const weiPrice = await presale.ethBuyHelper(tokensToPurchase);
                const USDTPrice = await presale.usdtBuyHelper(tokensToPurchase);

                //Buy with eth
                const buyWithEthTx = presale.connect(users.creator).buyWithEth(tokensToPurchase, { value: weiPrice });

                //Assert transaction was successful
                await expect(buyWithEthTx).not.to.be.reverted;

                //Assert TokensBought event was emitted
                expect(await buyWithEthTx)
                    .to.emit(presale, "TokensBought")
                    .withArgs(users.creator.address, "ETH", tokensToPurchase, USDTPrice, weiPrice);
            });
        });

        describe("'buyWithUSDT' function", function () {
            it("should increase purchased tokens amount and transfer payment to owner", async function () {
                //Set values
                const { correctedPresale: presale, users, saleStartTime, token, USDT } = await deployContractsFixture();
                const tokensToPurchase = 10000;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Get usdt price
                const USDTPrice = await presale.usdtBuyHelper(tokensToPurchase);

                //Add allowance to contract
                await USDT.connect(users.creator).approve(presale.address, USDTPrice);

                //Get values before transaction
                const purchaseTokensAmountBefore = await presale.userDeposits(users.creator.address);
                const USDTAmountBefore = await USDT.balanceOf(users.presaleOwner.address);

                //Buy with USDT
                const buyWithUSDTTx = presale.connect(users.creator).buyWithUSDT(tokensToPurchase);

                //Assert transaction was successful
                await expect(buyWithUSDTTx).not.to.be.reverted;

                //Get values after transaction
                const purchaseTokensAmountAfter = await presale.userDeposits(users.creator.address);
                const USDTAmountAfter = await USDT.balanceOf(users.presaleOwner.address);
                const decimals = await token.decimals();

                //Assert total sold price with expected
                expect(purchaseTokensAmountAfter).to.equal(
                    purchaseTokensAmountBefore.add(BigNumber.from(10).pow(decimals).mul(tokensToPurchase))
                );
                expect(USDTAmountAfter).to.equal(USDTAmountBefore.add(USDTPrice));
            });

            it("should revert if user blacklisted", async function () {
                //Set values
                const { correctedPresale: presale, users, saleStartTime, USDT } = await deployContractsFixture();
                const tokensToPurchase = 10000;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Blacklist user
                await presale.connect(users.presaleOwner).addToBlacklist([users.creator.address]);

                //Get usdt price
                const USDTPrice = await presale.usdtBuyHelper(tokensToPurchase);

                //Add allowance to contract
                await USDT.connect(users.creator).approve(presale.address, USDTPrice);

                //Buy with USDT
                const buyWithUSDTTx = presale.connect(users.creator).buyWithUSDT(tokensToPurchase);

                //Assert transaction was successful
                await expect(buyWithUSDTTx).to.be.rejectedWith("You are in blacklist");
            });

            it("should revert if trying to buy before sales start", async function () {
                //Set values
                const { correctedPresale: presale, users, USDT } = await deployContractsFixture();
                const tokensToPurchase = 10000;

                //Get usdt price
                const USDTPrice = await presale.usdtBuyHelper(tokensToPurchase);

                //Add allowance to contract
                await USDT.connect(users.creator).approve(presale.address, USDTPrice);

                //Buy with USDT
                const buyWithUSDTTx = presale.connect(users.creator).buyWithUSDT(tokensToPurchase);

                //Assert transaction was reverted
                await expect(buyWithUSDTTx).to.be.revertedWith("Invalid time for buying");
            });

            it("should revert if not enough allowance", async function () {
                //Set values
                const { correctedPresale: presale, users, saleStartTime } = await deployContractsFixture();
                const tokensToPurchase = 10000;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Buy with USDT
                const buyWithUSDTTx = presale.connect(users.creator).buyWithUSDT(tokensToPurchase);

                //Assert transaction was reverted
                await expect(buyWithUSDTTx).to.be.revertedWith("Not enough allowance");
            });

            it("should revert if try to buy more tokens than presale limit", async function () {
                //Set values
                const { correctedPresale: presale, users, saleStartTime, USDT } = await deployContractsFixture();
                const tokensToPurchase = stageAmount[stageAmount.length - 1] - (await presale.totalTokensSold());

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Get usdt price
                const USDTPrice = await presale.usdtBuyHelper(tokensToPurchase);

                //Add allowance to contract
                await USDT.connect(users.creator).approve(presale.address, USDTPrice);

                //Buy with USDT
                const buyWithUSDTTx = presale.connect(users.creator).buyWithUSDT(tokensToPurchase + 1);

                //Assert transaction was reverted
                await expect(buyWithUSDTTx).to.be.revertedWith("Insufficient funds");
            });

            it("should revert if try to buy less than stage minimum", async function () {
                //Set values
                const { correctedPresale: presale, users, saleStartTime, USDT } = await deployContractsFixture();
                const tokensToPurchase = stageAmount[stageAmount.length - 1] - (await presale.totalTokensSold());

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Get usdt price
                const USDTPrice = await presale.usdtBuyHelper(tokensToPurchase);

                //Add allowance to contract
                await USDT.connect(users.creator).approve(presale.address, USDTPrice);

                //Buy with USDT
                const buyWithUSDTTx = presale.connect(users.creator).buyWithUSDT(tokensToPurchase + 1);

                //Assert transaction was reverted
                await expect(buyWithUSDTTx).to.be.revertedWith("Insufficient funds");
            });

            it("should emit TokensBought event", async function () {
                //Set values
                const { correctedPresale: presale, users, saleStartTime, USDT } = await deployContractsFixture();
                const tokensToPurchase = 10000;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Get usdt price
                const USDTPrice = await presale.usdtBuyHelper(tokensToPurchase);

                //Add allowance to contract
                await USDT.connect(users.creator).approve(presale.address, USDTPrice);

                //Buy with USDT
                const buyWithUSDTTx = presale.connect(users.creator).buyWithUSDT(tokensToPurchase);

                //Assert transaction was successful
                await expect(buyWithUSDTTx).not.to.be.reverted;

                expect(await buyWithUSDTTx)
                    .to.emit(presale, "TokensBought")
                    .withArgs(users.creator.address, "USDT", tokensToPurchase, USDTPrice, USDTPrice);
            });
        });

        describe("'claim' function", function () {
            it("should increase purchased tokens amount and transfer payment to owner", async function () {
                //Set values
                const {
                    correctedPresale: presale,
                    token,
                    users,
                    saleStartTime,
                    saleEndTime,
                } = await deployContractsFixture();
                const tokensToPurchase = 10000;
                const claimStartTime = saleEndTime + 1;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Purchase some tokens
                await purchaseTokensFixture(presale, users.creator, tokensToPurchase);

                //Start claim
                await startClaimFixture(
                    presale,
                    token,
                    users.creator,
                    users.presaleOwner,
                    claimStartTime,
                    tokensToPurchase
                );

                //Get values before transaction
                const purchaseTokensAmountBefore = await presale.userDeposits(users.creator.address);
                const tokenBalanceBefore = await token.balanceOf(users.creator.address);

                //Timeshift to claim period
                await timeTravelFixture(claimStartTime + 1);

                //Claim tokens
                const claimTx = presale.connect(users.creator).claim();

                //Assert transaction was successful
                await expect(claimTx).not.to.be.reverted;

                //Get values after transaction
                const purchaseTokensAmountAfter = await presale.userDeposits(users.creator.address);
                const tokenBalanceAfter = await token.balanceOf(users.creator.address);

                //Assert values with expected
                expect(purchaseTokensAmountAfter).to.equal(0);
                expect(tokenBalanceAfter).to.equal(tokenBalanceBefore.add(purchaseTokensAmountBefore));
            });

            it("should revert if called before claim start time", async function () {
                //Set values
                const {
                    correctedPresale: presale,
                    users,
                    token,
                    saleStartTime,
                    saleEndTime,
                } = await deployContractsFixture();
                const tokensToPurchase = 10000;
                const claimStartTime = saleEndTime + 1;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Start claim
                await startClaimFixture(
                    presale,
                    token,
                    users.creator,
                    users.presaleOwner,
                    claimStartTime,
                    tokensToPurchase
                );

                //Purchase some tokens
                await purchaseTokensFixture(presale, users.creator, tokensToPurchase);

                //Claim tokens
                const claimTx = presale.connect(users.creator).claim();

                //Assert transaction was reverted
                await expect(claimTx).to.be.revertedWith("Claim has not started yet");
            });

            it("should revert if claim start time is not set", async function () {
                //Set values
                const { correctedPresale: presale, users, saleStartTime } = await deployContractsFixture();
                const tokensToPurchase = 10000;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Purchase some tokens
                await purchaseTokensFixture(presale, users.creator, tokensToPurchase);

                //Claim tokens
                const claimTx = presale.connect(users.creator).claim();

                //Assert transaction was reverted
                await expect(claimTx).to.be.revertedWith("Claim has not started yet");
            });

            it("should revert if no tokens purchased", async function () {
                //Set values
                const {
                    correctedPresale: presale,
                    users,
                    token,
                    saleStartTime,
                    saleEndTime,
                } = await deployContractsFixture();
                const tokensToPurchase = 10000;
                const claimStartTime = saleEndTime + 1;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Start claim
                await startClaimFixture(
                    presale,
                    token,
                    users.creator,
                    users.presaleOwner,
                    claimStartTime,
                    tokensToPurchase
                );

                //Timeshift to claim period
                await timeTravelFixture(claimStartTime + 1);

                //Claim tokens
                const claimTx = presale.connect(users.presaleOwner).claim();

                //Assert transaction was reverted
                await expect(claimTx).to.be.revertedWith("Nothing to claim");
            });

            it("should revert if already claimed", async function () {
                //Set values
                const {
                    correctedPresale: presale,
                    users,
                    token,
                    saleStartTime,
                    saleEndTime,
                } = await deployContractsFixture();
                const tokensToPurchase = 10000;
                const claimStartTime = saleEndTime + 1;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Purchase some tokens
                await purchaseTokensFixture(presale, users.creator, tokensToPurchase);

                //Start claim
                await startClaimFixture(
                    presale,
                    token,
                    users.creator,
                    users.presaleOwner,
                    claimStartTime,
                    tokensToPurchase
                );

                //Timeshift to claim period
                await timeTravelFixture(claimStartTime + 1);

                //Claim tokens
                await presale.connect(users.creator).claim();

                //Claim tokens again
                const claimTx = presale.connect(users.creator).claim();

                //Assert transaction was reverted
                await expect(claimTx).to.be.revertedWith("Already claimed");
            });

            it("should emit TokensClaimed event", async function () {
                //Set values
                const {
                    correctedPresale: presale,
                    users,
                    token,
                    saleStartTime,
                    saleEndTime,
                } = await deployContractsFixture();
                const tokensToPurchase = 10000;
                const claimStartTime = saleEndTime + 1;

                //Timeshift to sale period
                await timeTravelFixture(saleStartTime + 1);

                //Purchase some tokens
                await purchaseTokensFixture(presale, users.creator, tokensToPurchase);

                //Start claim
                await startClaimFixture(
                    presale,
                    token,
                    users.creator,
                    users.presaleOwner,
                    claimStartTime,
                    tokensToPurchase
                );

                //Timeshift to claim period
                await timeTravelFixture(claimStartTime + 1);

                //Claim tokens
                const claimTx = presale.connect(users.creator).claim();

                //Assert transaction was successful
                await expect(claimTx).not.to.be.reverted;

                //Assert event was emitted
                expect(claimTx).to.emit(presale, "TokensClaimed").withArgs(users.creator.address, tokensToPurchase);
            });
        });

        describe("'ethBuyHelper' function", function () {
            it("should calculate correct wei price", async function () {
                //Set values
                const { correctedPresale: presale } = await deployContractsFixture();
                const tokensToPurchase = 1000;

                //calculate expected price
                const expectedPrice = stagePrice[await presale.currentStep()]
                    .mul(tokensToPurchase)
                    .mul(BigNumber.from(10).pow(18))
                    .div(await presale.getLatestPrice());

                //Calculate wei price
                const ethBuyHelperTx = presale.ethBuyHelper(tokensToPurchase);

                //Assert transaction was successful
                await expect(ethBuyHelperTx).not.to.be.reverted;

                //Assert price with expected
                expect(await ethBuyHelperTx).to.equal(expectedPrice);
            });
        });

        describe("'usdtBuyHelper' function", function () {
            it("should calculate correct USDT price", async function () {
                //Set values
                const { correctedPresale: presale } = await deployContractsFixture();
                const tokensToPurchase = 1000;

                //calculate expected price
                const expectedPrice = stagePrice[await presale.currentStep()]
                    .mul(tokensToPurchase)
                    .div(BigNumber.from(10).pow(12));

                //Calculate USDT price
                const usdtBuyHelperTx = presale.usdtBuyHelper(tokensToPurchase);

                //Assert transaction was successful
                await expect(usdtBuyHelperTx).not.to.be.reverted;

                //Assert price with expected
                expect(await usdtBuyHelperTx).to.equal(expectedPrice);
            });
        });

        describe("'resqueERC20' function", function () {
            it("should transfer usdt from contract to address", async function () {
                //Set values
                const { correctedPresale: presale, USDT, users } = await deployContractsFixture();

                await USDT.connect(users.creator).transfer(presale.address, 1000000);

                //calculate values before
                const balancePresaleBefore = await USDT.balanceOf(presale.address);
                const balanceUserBefore = await USDT.balanceOf(users.presaleOwner.address);

                //Resque tx
                const resqueERC20Tx = presale
                    .connect(users.presaleOwner)
                    .resqueERC20(USDT.address, balancePresaleBefore);

                //Assert transaction was successful
                await expect(resqueERC20Tx).not.to.be.reverted;

                //calculate values after
                const balancePresaleAfter = await USDT.balanceOf(presale.address);
                const balanceUserAfter = await USDT.balanceOf(users.presaleOwner.address);

                //Assert price with expected
                expect(balancePresaleAfter).to.equal(0);
                expect(balanceUserAfter).to.equal(balanceUserBefore.add(balancePresaleBefore));
            });

            it("should revert if called not by the owner", async function () {
                //Set values
                const { correctedPresale: presale, USDT, users } = await deployContractsFixture();

                await USDT.connect(users.creator).transfer(presale.address, 1000000);

                //calculate values before
                const balancePresaleBefore = await USDT.balanceOf(presale.address);

                //Resque transaction
                const resqueERC20Tx = presale.resqueERC20(USDT.address, balancePresaleBefore);

                //Assert transaction was reverted
                await expect(resqueERC20Tx).to.be.revertedWith("Ownable: caller is not the owner");
            });
        });
    });

    describe("Edge cases after substitution", function () {
        it("should have correct values after tokens was bought", async function () {
            const { originalPresale, USDT, token, ChainlinkPriceFeed, saleEndTime, saleStartTime, users } =
                await deployOriginalPresaleFixture();

            const betaPresale = await deployBetaPresaleFixture(
                token,
                ChainlinkPriceFeed,
                USDT,
                users.creator,
                users.presaleOwner
            );

            const presaleCorrectedFactory = await hre.ethers.getContractFactory("MetacadePresaleV2");
            const presaleCorrected = await presaleCorrectedFactory
                .connect(users.creator)
                .deploy(
                    originalPresale.address,
                    betaPresale.address,
                    token.address,
                    ChainlinkPriceFeed.address,
                    USDT.address,
                    stageAmount,
                    stagePrice,
                    stageMinimumAmount,
                    saleStartTime,
                    saleEndTime
                );

            const tokensToPurchase = 100000000;

            const tokensBeforeTransaction = await presaleCorrected.userDeposits(users.creator.address);

            await timeTravelFixture(saleStartTime + 1);

            await purchaseTokensFixture(presaleCorrected, users.creator, tokensToPurchase);

            const totalTokensSold = await presaleCorrected.totalTokensSold();
            const currentStage = await presaleCorrected.currentStep();

            const tokensAfterTransaction = await presaleCorrected.userDeposits(users.creator.address);

            expect(tokensAfterTransaction).to.equal(
                tokensBeforeTransaction.add(BigNumber.from(10).pow(18).mul(tokensToPurchase))
            );
            expect(currentStage).to.equal(calculateCurrentStepFixture(totalTokensSold));
        });

        it("should correctly start claim", async function () {
            const { originalPresale, USDT, token, ChainlinkPriceFeed, users } = await deployOriginalPresaleFixture();

            const betaPresale = await deployBetaPresaleFixture(
                token,
                ChainlinkPriceFeed,
                USDT,
                users.creator,
                users.presaleOwner
            );

            const presaleCorrected = await deployCorrectedPresaleFixture(
                originalPresale,
                betaPresale,
                token,
                ChainlinkPriceFeed,
                USDT,
                users.creator,
                users.presaleOwner
            );

            const totalTokensSold = await presaleCorrected.totalTokensSold();

            const endTime = await presaleCorrected.endTime();
            const claimStart = endTime.add(60);

            await token
                .connect(users.creator)
                .transfer(presaleCorrected.address, BigNumber.from(10).pow(18).mul(totalTokensSold));

            await presaleCorrected.connect(users.presaleOwner).configureClaim(claimStart);

            const correctedClaimStart = await presaleCorrected.claimStart();

            expect(claimStart).to.equal(correctedClaimStart);
        });

        it("should correctly claim tokens", async function () {
            const { originalPresale, USDT, token, ChainlinkPriceFeed, saleEndTime, saleStartTime, users } =
                await deployOriginalPresaleFixture();

            const betaPresale = await deployBetaPresaleFixture(
                token,
                ChainlinkPriceFeed,
                USDT,
                users.creator,
                users.presaleOwner
            );

            const presaleCorrected = await deployCorrectedPresaleFixture(
                originalPresale,
                betaPresale,
                token,
                ChainlinkPriceFeed,
                USDT,
                users.creator,
                users.presaleOwner
            );

            const tokensToPurchase = 100000000;

            await timeTravelFixture(saleStartTime + 1);

            await purchaseTokensFixture(presaleCorrected, users.creator, tokensToPurchase);

            const claimStartTime = saleEndTime + 60;

            await startClaimFixture(presaleCorrected, token, users.creator, users.presaleOwner, claimStartTime);

            const tokenAmount = await presaleCorrected.userDeposits(users.creator.address);

            await timeTravelFixture(claimStartTime + 1);

            const tokenBalanceBeforeClaim = await token.balanceOf(users.creator.address);

            await presaleCorrected.connect(users.creator).claim();

            const tokenBalanceAfterClaim = await token.balanceOf(users.creator.address);
            const hasClaimed = await presaleCorrected.hasClaimed(users.creator.address);

            expect(tokenBalanceAfterClaim).to.equal(tokenBalanceBeforeClaim.add(tokenAmount));
            expect(hasClaimed).to.equal(true);
        });
    });
});
