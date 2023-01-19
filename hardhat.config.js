require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  network:{
    hardhat: {
      accounts: {
        accountsBalance: "100000000000000000000000000",
      },
    }
  }
};
