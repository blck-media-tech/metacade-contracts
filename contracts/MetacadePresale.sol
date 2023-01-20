// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./testEnvContracts/MetacadeOriginal.sol";
import "../interfaces/IMetacadePresale.sol";

contract MetacadePresale is IMetacadePresale, Pausable, Ownable, ReentrancyGuard {
    address public immutable saleToken;
    MetacadeOriginal public immutable previousPresale;
    MetacadeOriginal public immutable betaPresale;

    uint256 public totalTokensSold;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public claimStart;
    uint256 public currentStep;

    uint256[9] public token_amount;
    uint256[9] public token_price;
    uint8 constant maxStageIndex = 8;

    IERC20 public USDTInterface;
    Aggregator public aggregatorInterface;

    mapping(address => uint256) usersDeposits;
    mapping(address => bool) public hasClaimed;//TODO:change bool to smth more effective
    mapping(address => bool) public blacklist;//TODO:-//-

    modifier checkSaleState(uint256 amount) {
//        require(
//            block.timestamp >= startTime && block.timestamp <= endTime,
//            "Invalid time for buying"
//        );
        require(amount > 0, "Invalid sale amount");
        require(amount + totalTokensSold <= token_amount[maxStageIndex], "Insufficient funds");
        _;
    }

//    function configure(
//        address _aggregatorInterface,
//        address _USDTInterface,
//        uint256[9] _token_amount,
//        uint256[9] _token_price,
//        uint256 _startTime,
//        uint256 _endTime,
//        uint256 _currentStep
//    //TODO: think about ability to block configuration
//    ) {
//        aggregatorInterface = _aggregatorInterface;
//        USDTInterface = _USDTInterface;
//        token_amount = _token_amount;
//        token_price = _token_price;
//        currentStep = _currentStep;
//    }

    constructor(
        address _previousPresale,
        address _betaPresale,
        address _saleToken,
        address _aggregatorInterface,
        address _USDTInterface,
        uint256[9] memory _token_amount,
        uint256[9] memory _token_price,
        uint256 _startTime,
        uint256 _endTime
    ) {
        previousPresale = MetacadeOriginal(_previousPresale);
        betaPresale = MetacadeOriginal(_betaPresale);
        totalTokensSold = previousPresale.totalTokensSold() + betaPresale.totalTokensSold();
        saleToken = _saleToken;
        aggregatorInterface = Aggregator(_aggregatorInterface);
        USDTInterface = IERC20(_USDTInterface);
        token_amount = _token_amount;
        token_price = _token_price;
        startTime = _startTime;
        endTime = _endTime;
        currentStep = _getStageByTotalSoldAmount();

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
    {
//            require(block.timestamp < startTime, "Sale already started");
//            require(block.timestamp < _startTime, "Sale time in past");
            if (startTime != _startTime) startTime = _startTime;

//            require(block.timestamp < endTime, "Sale already ended");
//            require(_endTime > startTime, "Invalid endTime");
            if (endTime != _endTime) endTime = _endTime;
            emit SaleTimeSet(
                _startTime,
                _endTime,
                block.timestamp
        );
    }

    function configureClaim(
        uint256 _claimStartTime,
        uint256 amount
    ) external onlyOwner returns (bool) {
//        require(_claimStartTime > endTime && _claimStartTime > block.timestamp, "Invalid claim start time");
        require(amount >= totalTokensSold, "Tokens less than sold");
        require(IERC20(saleToken).balanceOf(address(this)) >= amount * 1e18, "Not enough balance");
        claimStart = _claimStartTime;
        return true;
    }

    function addToBlacklist(address _user) external onlyOwner {
        blacklist[_user] = true;
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
        return _calculateInternalCost(totalTokensSold, 0 ,0);//FIXME:this will calculate values including previous presales and might have mistakes if beta presale sold more tokens that 140000000
    }

    function userDeposits(address user) public view returns(uint256) {
        if (hasClaimed[user]) return 0;
        return usersDeposits[user] + previousPresale.userDeposits(user) + betaPresale.userDeposits(user);
    }

    function buyWithEth(uint256 amount) external payable checkSaleState(amount) whenNotPaused nonReentrant returns (bool) {
        uint256 weiAmount = ethBuyHelper(amount);
        require(msg.value >= weiAmount, "Less payment");
        _sendValue(payable(owner()), weiAmount);
        uint256 excess = msg.value - weiAmount;
        if (excess > 0) _sendValue(payable(_msgSender()), excess);
        totalTokensSold += amount;
        usersDeposits[_msgSender()] += amount * 1e18;
        uint8 stageAfterPurchase = _getStageByTotalSoldAmount();
        if (stageAfterPurchase>currentStep) currentStep = stageAfterPurchase;
        emit TokensBought(
            _msgSender(),
            amount,
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
        require(usdtPrice <= allowance, "Not enough allowance");
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
        usersDeposits[_msgSender()] += amount * 1e18;
        uint8 stageAfterPurchase = _getStageByTotalSoldAmount();
        if (stageAfterPurchase>currentStep) currentStep = stageAfterPurchase;
        emit TokensBought(
            _msgSender(),
            amount,
            usdtPrice,
            block.timestamp
        );
        return true;
    }

    function claim() external whenNotPaused nonReentrant {
        require(block.timestamp >= claimStart && claimStart > 0, "Claim has not started yet");
        require(!hasClaimed[_msgSender()], "Already claimed");
        uint256 amount = userDeposits(_msgSender());
        require(amount > 0, "Nothing to claim");
        hasClaimed[_msgSender()] = true;//TODO: change boolean to uint
        bool success = IERC20(saleToken).transfer(_msgSender(), amount);
        require(success, "Transfer failed");
        emit TokensClaimed(_msgSender(), amount, block.timestamp);
    }

    function getLatestPrice() public view returns (uint256) {
        (, int256 price, , ,) = aggregatorInterface.latestRoundData();
        return uint256(price * 1e10);
    }

    function ethBuyHelper(uint256 amount) public view returns (uint256 ethAmount) {
        ethAmount = calculatePrice(amount) * 1e18  / getLatestPrice();
    }

    function usdtBuyHelper(uint256 amount) public view returns (uint256 usdtPrice) {
        usdtPrice = calculatePrice(amount) / 1e12;
    }

    function calculatePrice(uint256 _amount) public view returns (uint256) {
        require(_amount + totalTokensSold <= token_amount[maxStageIndex], "Insufficient token amount.");
        return _calculateInternalCost(_amount, currentStep, totalTokensSold);
    }

    function _sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Low balance");
        (bool success,) = recipient.call{value : amount}("");
        require(success, "ETH Payment failed");
    }

    function _calculateInternalCost(uint256 _amount, uint256 _currentStage, uint256 _totalTokensSold) internal view returns (uint256 cost){
        if (_totalTokensSold + _amount <= token_amount[_currentStage]) {
            cost = _amount * token_price[_currentStage];
        }
        else {
            uint256 currentStageAmount = token_amount[_currentStage] - _totalTokensSold;
            uint256 nextStageAmount = _amount - currentStageAmount;
            cost = currentStageAmount * token_price[_currentStage] + _calculateInternalCost(nextStageAmount, _currentStage + 1, token_amount[_currentStage]);
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
