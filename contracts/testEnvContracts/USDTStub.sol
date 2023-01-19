// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDTStub is ERC20 {
    constructor(uint256 _initialSupply)
    ERC20("USDTToken", "USDT") {
        _mint(msg.sender, _initialSupply * 10**decimals());
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }
}
