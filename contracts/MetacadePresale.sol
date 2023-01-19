// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./testEnvContracts/MetacadeOriginal.sol";

contract MetacadePresale is Pausable, Ownable, ReentrancyGuard {
    address public immutable saleToken;
    MetacadeOriginal public immutable previousPresale;

    uint256 public totalTokensSold;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public claimStart;

    uint256[8] public token_amount;
    uint256[8] public token_price;
    uint8 constant maxStageIndex = 7;
    uint256 public currentStep;
    uint256 public baseDecimals;

    IERC20 public USDTInterface;
    Aggregator public aggregatorInterface;

    mapping(address => uint256) usersDeposits;
    mapping(address => bool) public hasClaimed;

    event SaleTimeSet(uint256 _start, uint256 _end, uint256 timestamp);

    event SaleTimeUpdated(
        bytes32 indexed key,
        uint256 prevValue,
        uint256 newValue,
        uint256 timestamp
    );

    event TokensBought(
        address indexed user,
        uint256 indexed tokensBought,
        address indexed purchaseToken,
        uint256 amountPaid,
        uint256 timestamp
    );

    event TokensAdded(
        address indexed token,
        uint256 noOfTokens,
        uint256 timestamp
    );
    event TokensClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    event ClaimStartUpdated(
        uint256 prevValue,
        uint256 newValue,
        uint256 timestamp
    );

    modifier checkSaleState(uint256 amount) {
//        require(
//            block.timestamp >= startTime && block.timestamp <= endTime,
//            "Invalid time for buying"
//        );
        require(amount > 0, "Invalid sale amount");
        require(amount + totalTokensSold <= token_amount[maxStageIndex], "Insufficient funds");
        _;
    }

    constructor(
        address _previousPresale
    ) {
        previousPresale = MetacadeOriginal(_previousPresale);
        totalTokensSold = previousPresale.totalTokensSold();
        saleToken = previousPresale.saleToken();
        aggregatorInterface = previousPresale.aggregatorInterface();
        USDTInterface = previousPresale.USDTInterface();
        //TODO:pass below to constructor
        startTime = previousPresale.startTime();
        endTime = previousPresale.endTime();
        currentStep = previousPresale.currentStep();
        baseDecimals = previousPresale.baseDecimals();

        token_amount = [
            157_500_000,
            315_000_000,
            472_500_000,
            630_000_000,
            787_500_000,
            945_000_000,
            1_102_500_000,
            1_260_000_000
        ];

        token_price = [
            10_000_000_000_000_000,
            12_000_000_000_000_000,
            13_000_000_000_000_000,
            14_000_000_000_000_000,
            15_500_000_000_000_000,
            17_000_000_000_000_000,
            18_500_000_000_000_000,
            20_000_000_000_000_000
        ];

        emit SaleTimeSet(startTime, endTime, block.timestamp);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setEndTime(uint256 _newEndtime) external onlyOwner{
//        require(startTime > 0, "Sale not started yet");
//        require(_newEndtime > block.timestamp, "Endtime must be in the future");
        endTime = _newEndtime;
    }

    function changeSaleTimes(uint256 _startTime, uint256 _endTime)
    external
    onlyOwner
    {//TODO:remove unnecessary logic
        //TODO:refactor to 1 event instead of 2
//        require(_startTime > 0 || _endTime > 0, "Invalid parameters");
        if (_startTime > 0) {
//            require(block.timestamp < startTime, "Sale already started");
//            require(block.timestamp < _startTime, "Sale time in past");
            uint256 prevValue = startTime;
            startTime = _startTime;
            emit SaleTimeUpdated(
                bytes32("START"),
                prevValue,
                _startTime,
                block.timestamp
            );
        }

        if (_endTime > 0) {
//            require(block.timestamp < endTime, "Sale already ended");
//            require(_endTime > startTime, "Invalid endTime");
            uint256 prevValue = endTime;
            endTime = _endTime;
            emit SaleTimeUpdated(
                bytes32("END"),
                prevValue,
                _endTime,
                block.timestamp
            );
        }
    }

    function startClaim(
        uint256 _claimStartTime,
        uint256 amount
    ) external onlyOwner returns (bool) {//FIXME:maybe startClaim should change only variable
//        require(_claimStartTime > endTime && _claimStartTime > block.timestamp, "Invalid claim start time");
        require(amount >= totalTokensSold, "Tokens less than sold");
        require(claimStart == 0, "Claim already set");
        claimStart = _claimStartTime;
        bool success = IERC20(saleToken).transferFrom(
            _msgSender(),
            address(this),
                amount*baseDecimals
        );
        require(success, "Transfer failed");
        emit TokensAdded(saleToken, amount, block.timestamp);
        return true;
    }

    function changeClaimStartTime(uint256 _claimStartTime) external onlyOwner returns (bool) {//TODO: merge with startClaim function
        require(claimStart > 0, "Initial claim data not set");
//        require(_claimStartTime > endTime, "Sale in progress");
//        require(_claimStartTime > block.timestamp, "Claim start in past");
        uint256 prevValue = claimStart;
        claimStart = _claimStartTime;
        emit ClaimStartUpdated(
            prevValue,
            _claimStartTime,
            block.timestamp
        );
        return true;
    }

    function getCurrentPrice() external view returns (uint256) {
        return token_price[currentStep];
    }

    function getSoldOnCurrentStage() external view returns (uint256 soldOnCurrentStage) {
        soldOnCurrentStage = totalTokensSold - ((currentStep == 0)? 0 : token_amount[currentStep-1]);
    }

    function getTotalPresaleAmount() external view returns (uint256) {
        return token_amount[maxStageIndex];
    }

    function totalSoldPrice() external view returns (uint256) {
        return _calculateInternalCostForConditions(totalTokensSold, 0 ,0);
    }

    function userDeposits(address user) public view returns(uint256) {
        if (hasClaimed[user]) return 0;
        return usersDeposits[user] + previousPresale.userDeposits(user);
    }

    function buyWithEth(uint256 amount) external payable checkSaleState(amount) whenNotPaused nonReentrant returns (bool) {
        uint256 weiAmount = ethBuyHelper(amount);
        require(msg.value >= weiAmount, "Less payment");
        _sendValue(payable(owner()), weiAmount);
        uint256 excess = msg.value - weiAmount;
        if (excess > 0) _sendValue(payable(_msgSender()), excess);
        totalTokensSold += amount;
        usersDeposits[_msgSender()] += amount * baseDecimals;
        uint8 stageAfterPurchase = _getStageByTotalSoldAmount();
        if (stageAfterPurchase>currentStep) currentStep = stageAfterPurchase;
        emit TokensBought(
            _msgSender(),
            amount,
            address(0),
            weiAmount,
            block.timestamp
        );
        return true;
    }

    function buyWithUSDT(uint256 amount) external checkSaleState(amount) whenNotPaused nonReentrant returns (bool) {
        uint256 usdtPrice = usdtBuyHelper(amount);
        uint256 allowance = USDTInterface.allowance(
            _msgSender(),
            address(this)
        );
        require(usdtPrice <= allowance, "Make sure to add enough allowance");
        (bool success,) = address(USDTInterface).call(
            abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                _msgSender(),
                owner(),
                usdtPrice
            )
        );
        require(success, "Token payment failed");
        totalTokensSold += amount;
        usersDeposits[_msgSender()] += amount * baseDecimals;
        uint8 stageAfterPurchase = _getStageByTotalSoldAmount();
        if (stageAfterPurchase>currentStep) currentStep = stageAfterPurchase;
        emit TokensBought(
            _msgSender(),
            amount,
            address(USDTInterface),
            usdtPrice,
            block.timestamp
        );
        return true;
    }

    function claim() external whenNotPaused {
        require(block.timestamp >= claimStart && claimStart > 0, "Claim has not started yet");
        require(!hasClaimed[_msgSender()], "Already claimed");
        uint256 amount = userDeposits(_msgSender());
        require(amount > 0, "Nothing to claim");
        usersDeposits[_msgSender()] = 0;
        hasClaimed[_msgSender()] = true;
        IERC20(saleToken).transfer(_msgSender(), amount);
        emit TokensClaimed(_msgSender(), amount, block.timestamp);
    }

    function getLatestPrice() public view returns (uint256) {
        (, int256 price, , ,) = aggregatorInterface.latestRoundData();
        return uint256(price * 1e10);
    }

    function ethBuyHelper(uint256 amount) public view returns (uint256 ethAmount) {
        ethAmount = calculatePrice(amount) * baseDecimals  / getLatestPrice();
    }

    function usdtBuyHelper(uint256 amount) public view returns (uint256 usdtPrice) {
        usdtPrice = calculatePrice(amount) / 1e12;
    }

    function calculatePrice(uint256 _amount) public view returns (uint256) {
        require(_amount + totalTokensSold <= token_amount[maxStageIndex], "Insufficient token amount.");
        return _calculateInternalCostForConditions(_amount, currentStep, totalTokensSold);
    }

    function _sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Low balance");
        (bool success,) = recipient.call{value : amount}("");
        require(success, "ETH Payment failed");
    }

    function _calculateInternalCostForConditions(uint256 _amount, uint256 _currentStage, uint256 _totalTokensSold) internal view returns (uint256 cost){
        if (_totalTokensSold + _amount <= token_amount[_currentStage]) {
            cost = _amount * token_price[_currentStage];
        }
        else {
            uint256 currentStageAmount = token_amount[_currentStage] - _totalTokensSold;
            uint256 nextStageAmount = _amount - currentStageAmount;
            cost = currentStageAmount * token_price[_currentStage] + _calculateInternalCostForConditions(nextStageAmount, _currentStage + 1, token_amount[_currentStage]);
        }

        return cost;
    }

    function _getStageByTotalSoldAmount() internal view returns (uint8) {
        uint8 stageIndex = maxStageIndex;
        while (stageIndex > 0) {
            if (token_amount[stageIndex - 1] < totalTokensSold) break;
            stageIndex -= 1;
        }
        return stageIndex;
    }
}
