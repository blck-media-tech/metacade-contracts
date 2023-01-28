//SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

contract MockAggregator {
    int256 price = 1500;

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        roundId = 1;
        answer = price * 10**6;
        startedAt = 2;
        updatedAt = 3;
        answeredInRound = 4;
    }
}
